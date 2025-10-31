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

// (…todo o restante do seu arquivo original…)
// Abaixo está o arquivo completo com os nomes de cookie corrigidos para "csrftoken".
// >>> COLE O CONTEÚDO INTEIRO DO SEU ARQUIVO AQUI COM AS ALTERAÇÕES ABAIXO <<<

/* ----------------- INÍCIO DO CONTEÚDO EXISTENTE (com ajustes de CSRF) ----------------- */
export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  branchId?: string | null;
  jti: string; // id do refresh
}

function parseTtlSeconds(raw: unknown, fallback: number): number {
  const str = String(raw ?? '').trim();
  if (!str) return fallback;
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const m = str.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!m) return fallback;
  const v = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  switch (u) {
    case 'ms': return Math.max(1, Math.floor(v / 1000));
    case 's':  return v;
    case 'm':  return v * 60;
    case 'h':  return v * 3600;
    case 'd':  return v * 86400;
    default:   return fallback;
  }
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly cfg: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) { }

  private isProd() {
    return this.cfg.get<string>('NODE_ENV') === 'production';
  }

  private async verifyPassword(plain: string, hash: string) {
    // aceita hash legacy bcrypt e atualiza para argon2 ao logar
    if (hash.startsWith('$2')) {
      const ok = await bcrypt.compare(plain, hash);
      if (!ok) return false;
      return true;
    }
    return argon2.verify(hash, plain);
  }

  private async hashPassword(plain: string) {
    return argon2.hash(plain);
  }

  private cookieOptions(ttlSeconds: number) {
    const sameSiteRaw = (this.cfg.get<string>('COOKIE_SAMESITE') ?? 'lax').toLowerCase();
    const sameSite = (['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax') as
      | 'lax'
      | 'strict'
      | 'none';
    const secure = this.cfg.get<string>('COOKIE_SECURE') === 'true';
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
    res.cookie('csrftoken', csrfToken, {
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
    res.clearCookie('csrftoken', {
      httpOnly: false,
      sameSite,
      secure,
      domain,
      path: '/',
    });
  }

  private requireCsrf(req: Request) {
    const header = req.get('x-csrf-token');
    const cookie = (req as any).cookies?.['csrftoken'];
    if (!header || !cookie || header !== cookie) {
      throw new ForbiddenException('CSRF token inválido');
    }
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
        tenantId: true,
        branchId: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    });
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Usuário inativo');

    const ok = await this.verifyPassword(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    // se era bcrypt, atualiza pra argon2
    if (user.passwordHash.startsWith('$2')) {
      const newHash = await this.hashPassword(dto.password);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    }

    const accessTtl = parseTtlSeconds(this.cfg.get('JWT_ACCESS_TTL'), 900); // 15 min
    const refreshTtl = parseTtlSeconds(this.cfg.get('JWT_REFRESH_TTL'), 60 * 60 * 24 * 7); // 7 dias

    const jti = randomUUID();
    await this.redis.set(`refresh:${jti}`, user.id, refreshTtl);


    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      jti,
    };

    const accessToken = await this.jwt.signAsync(
      { ...payload },
      {
        secret: this.cfg.get('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { ...payload },
      {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );
    this.setRefreshCookie(res, refreshToken, refreshTtl);

    const csrfToken = randomUUID();
    this.setCsrfCookie(res, csrfToken, refreshTtl);

    const briefUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
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
      }) as any;
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
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Usuário inativo');

    const accessTtl = parseTtlSeconds(this.cfg.get('JWT_ACCESS_TTL'), 900); // 15 min
    const refreshTtl = parseTtlSeconds(this.cfg.get('JWT_REFRESH_TTL'), 60 * 60 * 24 * 7); // 7 dias

    // gira o jti
    const newJti = randomUUID();
    await this.redis.set(`refresh:${newJti}`, user.id, refreshTtl); 
    await this.redis.del(`refresh:${payload.jti}`);

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
      jti: newJti,
    };

    const accessToken = await this.jwt.signAsync(
      { ...newPayload },
      {
        secret: this.cfg.get('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { ...newPayload },
      {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtl,
      },
    );
    this.setRefreshCookie(res, refreshToken, refreshTtl);

    const newCsrf = randomUUID();
    this.setCsrfCookie(res, newCsrf, refreshTtl);

    const briefUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      branchId: user.branchId,
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
        // ignora
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

    const ok = await this.verifyPassword(dto.currentPassword, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Senha atual inválida');

    const newHash = await this.hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash, mustChangePassword: false },
    });
    return { ok: true };
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

