import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';

// Converte "900", "15m", "7d" etc. → segundos (número)
function parseTtlSeconds(raw: unknown, fallback: number): number {
  const str = String(raw ?? '').trim();
  if (!str) return fallback;
  if (/^\d+$/.test(str)) return parseInt(str, 10);
  const m = str.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!m) return fallback;
  const v = parseInt(m[1], 10);
  const u = m[2].toLowerCase();
  switch (u) {
    case 'ms':
      return Math.max(1, Math.floor(v / 1000));
    case 's':
      return v;
    case 'm':
      return v * 60;
    case 'h':
      return v * 3600;
    case 'd':
      return v * 86400;
    default:
      return fallback;
  }
}

@Controller('auth')
export class CsrfController {
  constructor(private readonly cfg: ConfigService) {}

  @Get('csrf')
  @HttpCode(204)
  csrf(@Res({ passthrough: true }) res: Response) {
    const refreshTtlSec = parseTtlSeconds(
      this.cfg.get('JWT_REFRESH_TTL'),
      60 * 60 * 24 * 7,
    );
    const sameSiteRaw = (
      this.cfg.get<string>('COOKIE_SAMESITE') ?? 'lax'
    ).toLowerCase();
    const sameSite = (
      ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax'
    ) as 'lax' | 'strict' | 'none';
    const secure = this.cfg.get<string>('COOKIE_SECURE') === 'true';

    res.cookie('csrftoken', randomUUID(), {
      httpOnly: false,
      sameSite,
      secure,
      path: '/',
      maxAge: refreshTtlSec * 1000, // ms
    });
  }
}
