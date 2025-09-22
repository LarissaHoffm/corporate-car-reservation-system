import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
  import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';
import { Response, Request } from 'express';
import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';
import { LoginDto } from './dto/login.dto';
import { Role, UserStatus } from '@prisma/client';

type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  jti?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly redis: RedisService,
  ) {}

  //  helpers

  private isProd() {
    return this.cfg.get<string>('NODE_ENV') === 'production';
  }

  private getAccessTTL() {
    return this.cfg.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
  }

  private getRefreshTTLSeconds(rememberMe?: boolean) {
    const s = rememberMe
      ? this.cfg.get<string>('JWT_REFRESH_EXPIRES_REMEMBER') ?? '30d'
      : this.cfg.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    const m = /^(\d+)([mhd])$/.exec(s);
    if (!m) return 60 * 60 * 24 * 7;
    const v = parseInt(m[1], 10);
    const u = m[2];
    if (u === 'm') return v * 60;
    if (u === 'h') return v * 60 * 60;
    return v * 60 * 60 * 24;
  }

  private async signAccess(user: { id: string; email: string; role: Role }) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return this.jwt.signAsync(payload, {
      secret: this.cfg.get('JWT_ACCESS_SECRET'),
      expiresIn: this.getAccessTTL(),
    });
  }

  private cookieOptions(ttlSeconds: number) {
    const sameSite =
      (this.cfg.get<string>('COOKIE_SAMESITE') as 'lax' | 'strict' | 'none') ?? 'lax';
    const secure =
      this.cfg.get<string>('COOKIE_SECURE')?.toLowerCase() === 'true'
        ? true
        : this.isProd();
    const domain = this.cfg.get<string>('COOKIE_DOMAIN') || undefined;
    return { sameSite, secure, domain, ttlSeconds };
  }

  private setRefreshCookie(res: Response, token: string, ttlSeconds: number) {
    const { sameSite, secure, domain } = this.cookieOptions(ttlSeconds);
    res.cookie('refreshToken', token, {
      httpOnly: true,
      sameSite,
      secure,
      domain,
      path: '/',
      maxAge: ttlSeconds * 1000,
    });
  }

  private setCsrfCookie(res: Response, csrfToken: string, ttlSeconds: number) {
    const { sameSite, secure, domain } = this.cookieOptions(ttlSeconds);
    // NÃO httpOnly — para double-submit
    res.cookie('csrfToken', csrfToken, {
      httpOnly: false,
      sameSite,
      secure,
      domain,
      path: '/',
      maxAge: ttlSeconds * 1000,
    });
  }

  private clearCookies(res: Response) {
    const { sameSite, secure, domain } = this.cookieOptions(0);
    res.clearCookie('refreshToken', { httpOnly: true, sameSite, secure, domain, path: '/' });
    res.clearCookie('csrfToken', { httpOnly: false, sameSite, secure, domain, path: '/' });
  }

  private requireCsrf(req: Request) {
    const header = req.get('x-csrf-token');
    const cookie = req.cookies?.['csrfToken'];
    if (!header || !cookie || header !== cookie) {
      throw new ForbiddenException('CSRF token inválido');
    }
  }

  private toUser(u: { id: string; email: string; role: Role; status: UserStatus }) {
    return { id: u.id, email: u.email, role: u.role };
  }

  // endpoints

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, email: true, role: true, status: true, passwordHash: true },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('Usuário inativo');

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const accessToken = await this.signAccess(user);

    // refresh + CSRF
    const ttl = this.getRefreshTTLSeconds(dto.rememberMe);
    const jti = randomUUID();
    await this.redis.set(`refresh:${jti}`, user.id, ttl);

    const refreshToken = await this.jwt.signAsync({ sub: user.id, jti } as JwtPayload, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: `${ttl}s`,
    });

    this.setRefreshCookie(res, refreshToken, ttl);

    const csrf = randomUUID();
    this.setCsrfCookie(res, csrf, ttl);

    return {
      accessToken,
      user: this.toUser(user),
      csrfToken: csrf, 
    };
  }

  async refresh(req: Request, res: Response) {
    // Proteção CSRF (double-submit)
    this.requireCsrf(req);

    const token = req.cookies?.['refreshToken'];
    if (!token) throw new UnauthorizedException('Refresh ausente');

    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync(token, {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh inválido');
    }

    const userIdFromRedis = await this.redis.get(`refresh:${payload.jti}`);
    if (!userIdFromRedis || userIdFromRedis !== payload.sub) {
      throw new UnauthorizedException('Sessão expirada/revogada');
    }

    // usuário ainda válido?
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') {
      await this.redis.del(`refresh:${payload.jti}`);
      this.clearCookies(res);
      throw new UnauthorizedException('Usuário inválido/inativo');
    }

    // Rotaciona refresh
    const ttl = this.getRefreshTTLSeconds(false);
    const newJti = randomUUID();
    await this.redis.set(`refresh:${newJti}`, user.id, ttl);
    await this.redis.del(`refresh:${payload.jti}`);

    const newRefresh = await this.jwt.signAsync({ sub: user.id, jti: newJti } as JwtPayload, {
      secret: this.cfg.get('JWT_REFRESH_SECRET'),
      expiresIn: `${ttl}s`,
    });
    this.setRefreshCookie(res, newRefresh, ttl);

    // Rotaciona CSRF também
    const newCsrf = randomUUID();
    this.setCsrfCookie(res, newCsrf, ttl);

    const accessToken = await this.signAccess(user);
    return { accessToken, csrfToken: newCsrf };
  }

  async logout(req: Request, res: Response) {
    // Proteção CSRF
    this.requireCsrf(req);

    const token = req.cookies?.['refreshToken'];
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
          secret: this.cfg.get('JWT_REFRESH_SECRET'),
        });
        if (payload?.jti) await this.redis.del(`refresh:${payload.jti}`);
      } catch {
        // segue limpando
      }
    }
    this.clearCookies(res);
    return { ok: true };
  }
}
