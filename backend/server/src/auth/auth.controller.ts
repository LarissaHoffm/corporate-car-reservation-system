import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiHeader, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Audit } from '../infra/audit/audit.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @Audit('AUTH_LOGIN', 'Auth')
  @ApiOperation({
    summary:
      'Login — define cookies (refresh HttpOnly + csrf) e retorna accessToken + user',
  })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const out = await this.auth.login(dto, res);
    return { accessToken: out.accessToken, user: out.user };
  }

  @Post('refresh')
  @HttpCode(200)
  @Audit('AUTH_REFRESH', 'Auth')
  @ApiOperation({
    summary:
      'Refresh — requer header x-csrf-token igual ao cookie rcsrftoken/csrftoken',
    description: 'Após um refresh, o CSRF é rotacionado.',
  })
  @ApiHeader({
    name: 'x-csrf-token',
    required: true,
    description: 'Valor deve ser idêntico ao cookie rcsrftoken (ou csrftoken).',
  })
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.refresh(req, res);
    return { accessToken: out.accessToken };
  }

  @Post('logout')
  @HttpCode(200)
  @Audit('AUTH_LOGOUT', 'Auth')
  @ApiOperation({
    summary:
      'Logout — requer x-csrf-token igual ao cookie rcsrftoken/csrftoken',
  })
  @ApiHeader({
    name: 'x-csrf-token',
    required: true,
    description: 'Valor deve ser idêntico ao cookie rcsrftoken (ou csrftoken).',
  })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req, res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(200)
  @Audit('AUTH_CHANGE_PASSWORD', 'Auth')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary:
      'Troca a própria senha; zera mustChangePassword, rotaciona refresh e retorna novo accessToken + user',
  })
  async changePassword(
    @Req() req: any,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const out = await this.auth.changePassword(req.user.id, dto, req, res);
    return { accessToken: out.accessToken, user: out.user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Identidade atual (requer Bearer access token)' })
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('get')
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Alias de /auth/me (requer Bearer access token)' })
  async get(@Req() req: any) {
    return this.auth.me(req.user.id);
  }
}
