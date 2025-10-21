import { Body, Controller, Get, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiHeader, ApiTags, ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import type { Request, Response } from 'express';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login (retorna accessToken + csrfToken + user resumo)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'P@ssw0rd123!' },
        rememberMe: { type: 'boolean', example: false },
      },
      required: ['email', 'password'],
    },
  })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto, res);
  }

  @ApiCookieAuth('refreshToken')
  @ApiHeader({
    name: 'x-csrf-token',
    required: true,
    description: 'CSRF double-submit token (copiar do cookie csrfToken ou do body do login/refresh)',
  })
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh do accessToken (retorna novo accessToken + csrfToken + user resumo)' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.refresh(req, res);
  }

  @ApiCookieAuth('refreshToken')
  @ApiHeader({
    name: 'x-csrf-token',
    required: true,
    description: 'CSRF double-submit token (copiar do cookie csrfToken ou do body do login/refresh)',
  })
  @Post('logout')
  @ApiOperation({ summary: 'Logout (revoga refresh, limpa cookies)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(req, res);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'APPROVER', 'REQUESTER')
  @ApiBearerAuth('access-token')
  @Get('me')
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch('change-password')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string', example: 'Tmp@1234Ab!' },
        newPassword: { type: 'string', example: 'S3nh@Nova123!' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiOperation({ summary: 'Trocar senha (usuário autenticado)' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(req.user.id, {
      currentPassword: dto.currentPassword,
      newPassword: dto.newPassword,
    });
    return { ok: true };
  }
}
