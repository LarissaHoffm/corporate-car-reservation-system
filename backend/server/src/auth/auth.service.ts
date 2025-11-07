import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../infra/prisma.service';
import { JwtService } from '@nestjs/jwt';
import type { Response, Request } from 'express';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';
import { LoginDto } from './dto/login.dto';
import { Role, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { ChangePasswordDto } from './dto/change-password.dto';

// Converte "15m" | "7d" | "3600" para segundos 
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
    case 'm':
      return val * 60;
    case 'h':
      return val * 3600;
    case 'd':
      return val * 86400;
    default:
      return val;
  }
}

type BaseJwtClaims = {
  sub: string;
  role: Role;
  tenantId?: string | null;
  mustChangePassword?: boolean;
};
type AccessJwtPayload = BaseJwtClaims;
type RefreshJwtPayload = BaseJwtClaims & { jti: string };

@Injectable()
export class AuthService {
  private readonly accessSecret = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

  private readonly accessTtlSec = toSeconds(
    process.env.JWT_ACCESS_TTL || process.env.JWT_ACCESS_EXPIRES || '15m',
    900,
  );
  private readonly refreshTtlSec = toSeconds(
    process.env.JWT_REFRESH_TTL || process.env.JWT_REFRESH_EXPIRES || '7d',
    604800,
  );

  private readonly cookieSecure =
    (process.env.COOKIE_SECURE ?? '').toString().toLowerCase() === 'true' ||
    process.env.NODE_ENV === 'production';
  private readonly cookieDomain = process.env.COOKIE_DOMAIN || undefined;
  private readonly cookieSameSite = process.env.COOKIE_SAMESITE ?? 'Lax';

  private refreshCookieName = process.env.REFRESH_COOKIE_NAME ?? 'rc_refresh_token';
  private csrfCookieName = process.env.CSRF_COOKIE_NAME ?? 'rcsrftoken';

  // compat
  private legacyRefreshCookie = 'rt';
  private legacyCsrfCookie = 'csrftoken';

  constructor(
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private normalizeSameSite(): 'lax' | 'strict' | 'none' {
    const s = String(this.cookieSameSite).toLowerCase();
    if (s === 'strict') return 'strict';
    if (s === 'none') return 'none';
    return 'lax';
  }

  private signAccessToken(payload: AccessJwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.accessSecret,
      expiresIn: this.accessTtlSec,
    });
  }

  // jti fica no payload 
  private signRefreshToken(payload: RefreshJwtPayload): string {
    return this.jwt.sign(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtlSec,
    });
  }

  private setAuthCookies(res: Response, refreshToken: string) {
    const sameSite = this.normalizeSameSite();

    // refresh atual + legado (HttpOnly)
    const optsHttpOnly = {
      httpOnly: true as const,
      sameSite,
      secure: this.cookieSecure,
      domain: this.cookieDomain,
      path: '/',
      maxAge: this.refreshTtlSec * 1000,
    };
    res.cookie(this.refreshCookieName, refreshToken, optsHttpOnly);
    if (this.refreshCookieName !== this.legacyRefreshCookie) {
      res.cookie(this.legacyRefreshCookie, refreshToken, optsHttpOnly);
    }

    // csrf atual + legado (legível no browser)
    const csrf = randomUUID();
    const optsReadable = {
      httpOnly: false as const,
      sameSite,
      secure: this.cookieSecure,
      domain: this.cookieDomain,
      path: '/',
      maxAge: this.refreshTtlSec * 1000,
    };
    res.cookie(this.csrfCookieName, csrf, optsReadable);
    if (this.csrfCookieName !== this.legacyCsrfCookie) {
      res.cookie(this.legacyCsrfCookie, csrf, optsReadable);
    }
  }

  // Hard-delete
  private clearAuthCookies(res: Response) {
    const sameSite = this.normalizeSameSite();
    const namesHttpOnly = [this.refreshCookieName, this.legacyRefreshCookie];
    const namesReadable = [this.csrfCookieName, this.legacyCsrfCookie];

    const variants = [{ domain: this.cookieDomain }, {}] as Array<{ domain?: string }>;

    const emit = (name: string, httpOnly: boolean, v: { domain?: string }) => {
      const base = {
        sameSite,
        secure: this.cookieSecure,
        path: '/',
        ...(v.domain ? { domain: v.domain } : {}),
      };
      res.cookie(name, '', { ...base, httpOnly, maxAge: 0 });
      res.cookie(name, '', { ...base, httpOnly, expires: new Date(0) });
      res.clearCookie(name, { ...base, httpOnly });
    };

    for (const v of variants) {
      namesHttpOnly.forEach((n) => emit(n, true, v));
      namesReadable.forEach((n) => emit(n, false, v));
    }
  }

  private getRefreshFromReq(req: Request): string | undefined {
    const c = (req as any).cookies ?? {};
    return c[this.refreshCookieName] || c[this.legacyRefreshCookie];
  }
  private getCsrfFromReq(req: Request): string | undefined {
    const c = (req as any).cookies ?? {};
    return c[this.csrfCookieName] || c[this.legacyCsrfCookie];
  }

  private assertCsrf(req: Request) {
    const header = req.header('x-csrf-token');
    const cookie = this.getCsrfFromReq(req);
    if (!header || !cookie || header !== cookie) {
      throw new ForbiddenException('CSRF token invalid or missing');
    }
  }

  /* -------------------- login -------------------- */
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
        passwordHash: true,
        mustChangePassword: true,
      },
    });

    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (user.status === UserStatus.INACTIVE) throw new ForbiddenException('Usuário inativo');

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const accessPayload: AccessJwtPayload = {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      mustChangePassword: user.mustChangePassword ?? false,
    };
    const accessToken = this.signAccessToken(accessPayload);

    const jti = randomUUID();
    const refreshPayload: RefreshJwtPayload = { ...accessPayload, jti };
    const refreshToken = this.signRefreshToken(refreshPayload);
    this.setAuthCookies(res, refreshToken);

    try {
      await this.redis.set(`rt:${jti}`, JSON.stringify({ uid: user.id }), this.refreshTtlSec);
    } catch {
      /* best effort */
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mustChangePassword: user.mustChangePassword ?? false,
    };
    return { accessToken, user: safeUser };
  }

  /* -------------------- refresh -------------------- */
  async refresh(req: Request, res: Response) {
    this.assertCsrf(req);
    const token = this.getRefreshFromReq(req);
    if (!token) throw new UnauthorizedException('Refresh ausente');

    let payload: RefreshJwtPayload & { iat?: number; exp?: number };
    try {
      payload = this.jwt.verify(token, { secret: this.refreshSecret }) as RefreshJwtPayload;
    } catch {
      throw new UnauthorizedException('Refresh inválido');
    }
    if (!payload?.jti) throw new UnauthorizedException('Refresh sem JTI');

    const jtiKey = `rt:${payload.jti}`;
    const jtiVal = await this.redis.get(jtiKey);
    if (!jtiVal) throw new UnauthorizedException('Refresh expirado ou revogado');

    // rotação de refresh
    await this.redis.del(jtiKey);

    const newJti = randomUUID();
    const newRefreshPayload: RefreshJwtPayload = {
      sub: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId,
      mustChangePassword: payload.mustChangePassword ?? false,
      jti: newJti,
    };
    const newRefresh = this.signRefreshToken(newRefreshPayload);
    await this.redis.set(`rt:${newJti}`, JSON.stringify({ uid: payload.sub }), this.refreshTtlSec);
    this.setAuthCookies(res, newRefresh);

    const accessPayload: AccessJwtPayload = {
      sub: payload.sub,
      role: payload.role,
      tenantId: payload.tenantId,
      mustChangePassword: payload.mustChangePassword ?? false,
    };
    const accessToken = this.signAccessToken(accessPayload);

    return { accessToken };
  }

  /* -------------------- logout -------------------- */
  async logout(req: Request, res: Response) {
    this.assertCsrf(req);
    const token = this.getRefreshFromReq(req);
    if (token) {
      try {
        const payload = this.jwt.verify(token, { secret: this.refreshSecret }) as RefreshJwtPayload;
        if (payload?.jti) await this.redis.del(`rt:${payload.jti}`);
      } catch {
        /* ignore */
      }
    }
    this.clearAuthCookies(res);
    return { ok: true };
  }

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
    return u;
  }

  /* -------------------- change-password -------------------- */

  private isStrong(password: string): boolean {
    return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
  }

  async changePassword(userId: string, dto: ChangePasswordDto, req: Request, res: Response) {
    const { currentPassword, newPassword } = dto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        name: true,
        role: true,
        status: true,
        passwordHash: true,
        mustChangePassword: true,
      },
    });
    if (!user) throw new UnauthorizedException('Usuário não encontrado');
    if (user.status === UserStatus.INACTIVE) throw new ForbiddenException('Usuário inativo');

    const ok = await argon2.verify(user.passwordHash, currentPassword);
    if (!ok) throw new UnauthorizedException('Senha atual inválida');

    if (currentPassword === newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }
    if (!this.isStrong(newPassword)) {
      throw new BadRequestException(
        'Senha fraca: mínimo 8, com maiúscula, minúscula, dígito e símbolo.',
      );
    }

    const newHash = await argon2.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        mustChangePassword: false,
      },
    });

    // revoga refresh anterior (se houver)
    const oldRt = this.getRefreshFromReq(req);
    if (oldRt) {
      try {
        const payload = this.jwt.verify(oldRt, { secret: this.refreshSecret }) as RefreshJwtPayload;
        if (payload?.jti) await this.redis.del(`rt:${payload.jti}`);
      } catch {
        /* ignore */
      }
    }

    // emite novo refresh + novo access (mustChangePassword=false)
    const baseClaims: AccessJwtPayload = {
      sub: user.id,
      role: user.role,
      tenantId: user.tenantId,
      mustChangePassword: false,
    };
    const accessToken = this.signAccessToken(baseClaims);

    const jti = randomUUID();
    const refreshPayload: RefreshJwtPayload = { ...baseClaims, jti };
    const refreshToken = this.signRefreshToken(refreshPayload);
    this.setAuthCookies(res, refreshToken);

    try {
      await this.redis.set(`rt:${jti}`, JSON.stringify({ uid: user.id }), this.refreshTtlSec);
    } catch {
      /* best effort */
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      mustChangePassword: false,
    };

    return { accessToken, user: safeUser };
  }
}
