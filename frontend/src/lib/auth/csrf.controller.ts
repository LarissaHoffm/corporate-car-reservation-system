import { Controller, Get, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import { randomBytes } from 'crypto';

type SameSiteOpt = 'lax' | 'strict' | 'none';

@Controller('auth')
export class CsrfController {
  @Get('csrf')
  @HttpCode(204)
  csrf(@Res({ passthrough: true }) res: Response) {
    const cookieName = process.env.CSRF_COOKIE_NAME || 'csrftoken';
    const rawSameSite = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase() as SameSiteOpt;
    const sameSite: SameSiteOpt = rawSameSite === 'none' ? 'none' : rawSameSite === 'strict' ? 'strict' : 'lax';
    const secure = String(process.env.COOKIE_SECURE || 'false').toLowerCase() === 'true';
    const domain = process.env.COOKIE_DOMAIN || undefined;

    const token = randomBytes(24).toString('hex');

    const cookieOptions: Parameters<Response['cookie']>[2] = {
      httpOnly: false,           
      sameSite,                  
      secure,                    
      path: '/',
      maxAge: 60 * 60 * 1000,    
    };
    if (domain && domain !== 'localhost') {
      cookieOptions.domain = domain;
    }

    res.cookie(cookieName, token, cookieOptions);
  }
}
