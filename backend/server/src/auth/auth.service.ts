<<<<<<< HEAD
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
=======
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
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
import { PrismaService } from '../infra/prisma.service';
import { JwtService } from '@nestjs/jwt';
import type { Response, Request } from 'express';
import * as argon2 from 'argon2';
import { RedisService } from '../infra/redis.service';
import { LoginDto } from './dto/login.dto';
<<<<<<< HEAD
import { Role, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

/** Converte "15m" | "7d" | "3600" para segundos */
function toSeconds(input: string | number | undefined, fallback: number): number {
  if (typeof input === 'number') return input;
  if (!input) return fallback;
  const s = String(input).trim().toLowerCase();
  const m = s.match(/^(\d+)([smhd])?$/);
  if (!m) {
    const n = Number(s);
    return Number.isFinite(n) ? n : fallback;
  }
  const val = Number(m[1]);
  const unit = m[2] as 's' | 'm' | 'h' | 'd' | undefined;
  switch (unit) {
    case 'm': return val * 60;
    case 'h': return val * 3600;
    case 'd': return val * 86400;
    default: return val;
  }
}

/** Normaliza qualquer entrada para um valor válido do enum Role (UPPERCASE) */
function normalizeRole(input: unknown): Role {
  const v = String(input ?? '').toUpperCase();
  if (v === 'ADMIN') return Role.ADMIN;
  if (v === 'APPROVER') return Role.APPROVER;
  return Role.REQUESTER;
}

/** Claims comuns */
type BaseJwtClaims = {
  sub: string;                 // user id
  role: Role;
  tenantId?: string | null;
  mustChangePassword?: boolean;
};
=======

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
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415

/** Access token NÃO usa jti */
type AccessJwtPayload = BaseJwtClaims;

/** Refresh token com jti obrigatório */
type RefreshJwtPayload = BaseJwtClaims & { jti: string };

@Injectable()
export class AuthService {
  private readonly accessSecret  = process.env.JWT_ACCESS_SECRET  || 'dev_access_secret';
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';
  private readonly accessTtlSec  = toSeconds(process.env.JWT_ACCESS_EXPIRES  || '15m',  900);     // 15m
  private readonly refreshTtlSec = toSeconds(process.env.JWT_REFRESH_EXPIRES || '7d',   604800);  // 7d
  private readonly cookieSecure  = (process.env.NODE_ENV === 'production');

  constructor(
    private readonly jwt: JwtService,
<<<<<<< HEAD
    private readonly redis: RedisService,
  ) {}

  private signAccessToken(payload: AccessJwtPayload): string {
    return this.jwt.sign(payload, { secret: this.accessSecret, expiresIn: this.accessTtlSec });
    // (Mantemos secret/ttl aqui pois seu projeto já usa esse padrão.)
  }

  private signRefreshToken(payload: RefreshJwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtlSec,
      jwtid: payload.jti,
    });
  }

  private setRefreshCookie(res: Response, token: string) {
    res.cookie('rt', token, {
=======
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
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookieSecure,
      path: '/',
      maxAge: this.refreshTtlSec * 1000,
    });
  }

<<<<<<< HEAD
  /**
   * LOGIN
   * - Procura usuário por e-mail (case-insensitive).
   * - Valida senha e status.
   * - Gera access + refresh (com JTI) e armazena JTI no Redis (TTL).
   * - Role é normalizado para UPPERCASE, garantindo compatibilidade com @Roles(...)
   */
=======
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

>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
  async login(dto: LoginDto, res: Response) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        status: true,
<<<<<<< HEAD
=======
        tenantId: true,
        branchId: true,
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
        passwordHash: true,
        mustChangePassword: true,
      },
    });
<<<<<<< HEAD

    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Usuário inativo');
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const role = normalizeRole(user.role);

    const accessPayload: AccessJwtPayload = {
      sub: user.id,
      role,
      tenantId: user.tenantId,
      mustChangePassword: user.mustChangePassword ?? false,
    };
    const accessToken = this.signAccessToken(accessPayload);

    // Refresh — best effort: se Redis falhar, não derruba o login
    try {
      const jti = randomUUID();
      const refreshPayload: RefreshJwtPayload = { ...accessPayload, jti };
      const refreshToken = this.signRefreshToken(refreshPayload);

      await this.redis.set(`rt:${jti}`, JSON.stringify({ uid: user.id }), this.refreshTtlSec);
      this.setRefreshCookie(res, refreshToken);
    } catch {
      // logar se desejar, mas não quebrar o login
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role, // já normalizado (ADMIN|APPROVER|REQUESTER)
      status: user.status,
      mustChangePassword: user.mustChangePassword ?? false,
=======
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
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
    };

    return { accessToken, user: safeUser };
  }

  /**
   * REFRESH
   * - Lê cookie 'rt'.
   * - Verifica token e jti no Redis.
   * - Rotaciona refresh (revoga jti antigo, grava novo).
   * - Emite novo access (com role normalizado UPPERCASE).
   */
  async refresh(req: Request, res: Response) {
    const token = (req as any).cookies?.['rt'];
    if (!token) throw new UnauthorizedException('Refresh ausente');

    let payload: (RefreshJwtPayload & { iat?: number; exp?: number });
    try {
<<<<<<< HEAD
      payload = this.jwt.verify(token, { secret: this.refreshSecret }) as RefreshJwtPayload;
=======
      payload = await this.jwt.verifyAsync(token, {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
      }) as any;
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
    } catch {
      throw new UnauthorizedException('Refresh inválido');
    }
    if (!payload?.jti) throw new UnauthorizedException('Refresh sem JTI');

    const jtiKey = `rt:${payload.jti}`;
    const jtiVal = await this.redis.get(jtiKey);
    if (!jtiVal) throw new UnauthorizedException('Refresh expirado ou revogado');

<<<<<<< HEAD
    // rotação
    await this.redis.del(jtiKey);

    const role = normalizeRole(payload.role);

    const newJti = randomUUID();
    const newRefreshPayload: RefreshJwtPayload = {
      sub: payload.sub,
      role,
      tenantId: payload.tenantId,
      mustChangePassword: payload.mustChangePassword ?? false,
      jti: newJti,
=======
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
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
    };
    const newRefresh = this.signRefreshToken(newRefreshPayload);
    await this.redis.set(`rt:${newJti}`, JSON.stringify({ uid: payload.sub }), this.refreshTtlSec);
    this.setRefreshCookie(res, newRefresh);

    const accessPayload: AccessJwtPayload = {
      sub: payload.sub,
      role,
      tenantId: payload.tenantId,
      mustChangePassword: payload.mustChangePassword ?? false,
    };
    const accessToken = this.signAccessToken(accessPayload);

    return { accessToken };
  }

  /**
   * LOGOUT
   * - Revoga o jti do cookie (quando possível) e limpa o cookie.
   */
  async logout(req: Request, res: Response) {
    const token = (req as any).cookies?.['rt'];
    if (token) {
      try {
        const payload = this.jwt.verify(token, { secret: this.refreshSecret }) as RefreshJwtPayload;
        if (payload?.jti) await this.redis.del(`rt:${payload.jti}`);
      } catch {
<<<<<<< HEAD
        // se inválido/expirado, apenas limpar cookie
=======
        // ignora
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
      }
    }
    res.clearCookie('rt', { path: '/' });
    return { ok: true };
  }

<<<<<<< HEAD
  /**
   * ME — usado por /auth/me e /auth/get
   */
=======
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

>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
  async me(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        tenantId: true,
        mustChangePassword: true,
      },
    });
    if (!u) throw new UnauthorizedException();
    return {
      ...u,
      role: normalizeRole(u.role),
    };
  }
}

