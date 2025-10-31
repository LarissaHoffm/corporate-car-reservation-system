import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Response, Request } from 'express';
import * as argon2 from 'argon2';
import { randomUUID } from 'crypto';

import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';
import { LoginDto } from './dto/login.dto';
import { Role, UserStatus } from '@prisma/client';

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

/** Claims comuns */
type BaseJwtClaims = {
  sub: string;                 // user id
  role: Role;
  tenantId?: string | null;
  mustChangePassword?: boolean;
};

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
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private signAccessToken(payload: AccessJwtPayload): string {
    return this.jwt.sign(payload, { secret: this.accessSecret, expiresIn: this.accessTtlSec });
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
      httpOnly: true,
      sameSite: 'lax',
      secure: this.cookieSecure,
      path: '/',
      maxAge: this.refreshTtlSec * 1000,
    });
  }

  /**
   * LOGIN
   * - Procura usuário por e-mail (case-insensitive).
   * - Valida senha e status.
   * - Gera access + refresh (com JTI) e armazena JTI no Redis (TTL).
   * - Nunca lança 500 por falha de Redis (apenas segue sem refresh).
   */
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
    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException('Usuário inativo');
    }

    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw new UnauthorizedException('Credenciais inválidas');

    const accessPayload: AccessJwtPayload = {
      sub: user.id,
      role: user.role,
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
      // log opcional — não quebrar o login
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

  /**
   * REFRESH
   * - Lê cookie 'rt'.
   * - Verifica token e jti no Redis.
   * - Rotaciona refresh (revoga jti antigo, grava novo).
   * - Emite novo access.
   */
  async refresh(req: Request, res: Response) {
    const token = (req as any).cookies?.['rt'];
    if (!token) throw new UnauthorizedException('Refresh ausente');

    let payload: (RefreshJwtPayload & { iat?: number; exp?: number });
    try {
      payload = this.jwt.verify(token, { secret: this.refreshSecret }) as RefreshJwtPayload;
    } catch {
      throw new UnauthorizedException('Refresh inválido');
    }
    if (!payload?.jti) throw new UnauthorizedException('Refresh sem JTI');

    const jtiKey = `rt:${payload.jti}`;
    const jtiVal = await this.redis.get(jtiKey);
    if (!jtiVal) throw new UnauthorizedException('Refresh expirado ou revogado');

    // rotação
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
    this.setRefreshCookie(res, newRefresh);

    const accessPayload: AccessJwtPayload = {
      sub: payload.sub,
      role: payload.role,
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
        // se inválido/expirado, apenas limpar cookie
      }
    }
    res.clearCookie('rt', { path: '/' });
    return { ok: true };
  }

  /**
   * ME — usado por /auth/me e /auth/get
   */
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
}
