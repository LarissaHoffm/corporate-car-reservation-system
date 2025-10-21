import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as bcrypt from 'bcrypt'; 
import { randomUUID } from 'crypto';
import { Response, Request } from 'express';
import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';
import { LoginDto } from './dto/login.dto';
import { Role, UserStatus } from '@prisma/client';

type JwtPayload = {
  sub: string;
  email?: string;
  role?: Role;
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

  // helpers

  private isProd() {
    return this.cfg.get<string>('NODE_ENV') === 'production';
  }

  private getAccessTTL() {
    return this.cfg.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
  }

  private getRefreshTTLSeconds(rememberMe?: boolean) {
    const s =
      rememberMe
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

  private async signAccess(user: {
    id: string;
    email: string;
    role: Role;
    tenantId: string;
    branchId: string | null;
  }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId ?? null,
    };
    return this.jwt.signAsync(payload, {
      secret: this.cfg.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.getAccessTTL(),
    });
  }

  private cookieOptions(ttlSeconds: number) {
    const sameSite =
      (this.cfg.get<string>('COOKIE_SAMESITE') as 'lax' | 'strict' | 'none') ??
      'lax';
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
    res.clearCookie('refreshToken', {
      httpOnly: true,
      sameSite,
      secure,
      domain,
      path: '/',
    });
    res.clearCookie('csrfToken', {
      httpOnly: false,
      sameSite,
      secure,
      domain,
      path: '/',
    });
  }

  private requireCsrf(req: Request) {
    const header = req.get('x-csrf-token');
    const cookie = (req as any).cookies?.['csrfToken'];
    if (!header || !cookie || header !== cookie) {
      throw new ForbiddenException('CSRF token inválido');
    }
  }

  // helpers de senha: suportar bcrypt (seed) e argon2 (padrão novo)
  private async verifyPassword(hash: string, plain: string) {
    if (!hash) return false;
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
      return bcrypt.compare(plain, hash);
    }
    return argon2.verify(hash, plain);
  }

  private async hashPassword(plain: string) {
    return argon2.hash(plain);
  }

  // endpoints

  async login(dto: LoginDto, res: Response) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        passwordHash: true,
        tenantId: true,
        branchId: true,
        mustChangePassword: true,
      },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status !== 'ACTIVE')
      throw new ForbiddenException('Usuário inativo');

    const ok = await this.verifyPassword(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    // access
    const accessToken = await this.signAccess({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: (user as any).tenantId,
      branchId: (user as any).branchId ?? null,
    });

    // refresh + CSRF
    const ttl = this.getRefreshTTLSeconds(dto.rememberMe);
    const jti = randomUUID();
    await this.redis.set(`refresh:${jti}`, user.id, ttl);

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, jti } as JwtPayload,
      {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
        expiresIn: `${ttl}s`,
      },
    );
    this.setRefreshCookie(res, refreshToken, ttl);

    const csrfToken = randomUUID();
    this.setCsrfCookie(res, csrfToken, ttl);

    const briefUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    return {
      accessToken,
      csrfToken,
      user: briefUser,
    };
  }

  async refresh(req: Request, res: Response) {
    this.requireCsrf(req);

    const token = (req as any).cookies?.['refreshToken'];
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

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        tenantId: true,
        branchId: true,
        mustChangePassword: true,
      },
    });
    if (!user || user.status !== 'ACTIVE') {
      await this.redis.del(`refresh:${payload.jti}`);
      this.clearCookies(res);
      throw new UnauthorizedException('Usuário inválido/inativo');
    }

    const ttl = this.getRefreshTTLSeconds(false);
    const newJti = randomUUID();
    await this.redis.set(`refresh:${newJti}`, user.id, ttl);
    await this.redis.del(`refresh:${payload.jti}`);

    const newRefresh = await this.jwt.signAsync(
      { sub: user.id, jti: newJti } as JwtPayload,
      {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
        expiresIn: `${ttl}s`,
      },
    );
    this.setRefreshCookie(res, newRefresh, ttl);

    const newCsrf = randomUUID();
    this.setCsrfCookie(res, newCsrf, ttl);

    const accessToken = await this.signAccess({
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: (user as any).tenantId,
      branchId: (user as any).branchId ?? null,
    });

    const briefUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    return { accessToken, csrfToken: newCsrf, user: briefUser };
  }

  async logout(req: Request, res: Response) {
    this.requireCsrf(req);

    const token = (req as any).cookies?.['refreshToken'];
    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
          secret: this.cfg.get('JWT_REFRESH_SECRET'),
        });
        if (payload?.jti) await this.redis.del(`refresh:${payload.jti}`);
      } catch {
        
      }
    }
    this.clearCookies(res);
    return { ok: true };
  }

  async changePassword(
    userId: string,
    dto: { currentPassword: string; newPassword: string },
  ) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!u) throw new NotFoundException('Usuário não encontrado');

    const ok = await this.verifyPassword(u.passwordHash, dto.currentPassword);
    if (!ok) throw new UnauthorizedException('Senha atual incorreta.');

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(dto.newPassword)) {
      throw new BadRequestException(
        'Senha fraca. Use 8+ caracteres com maiúsculas, minúsculas e números.',
      );
    }

    const hash = await this.hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hash,
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      },
    });
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
        branchId: true,
        mustChangePassword: true,
      },
    });
  }
}
