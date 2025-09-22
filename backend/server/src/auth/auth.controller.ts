import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import type { Request, Response } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @ApiCookieAuth('refreshToken')
  @ApiHeader({ name: 'x-csrf-token', required: true, description: 'CSRF double-submit token (copiar do cookie csrfToken ou do body do login/refresh)' })
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }

  @ApiCookieAuth('refreshToken')
  @ApiHeader({ name: 'x-csrf-token', required: true, description: 'CSRF double-submit token (copiar do cookie csrfToken ou do body do login/refresh)' })
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'APPROVER', 'REQUESTER')
  @ApiBearerAuth('access-token')
  @Get('me')
  me(@Req() req: any) {
    const u = req.user as { userId: string; email: string; role: string };
    return { id: u.userId, email: u.email, role: u.role };
  }
}
