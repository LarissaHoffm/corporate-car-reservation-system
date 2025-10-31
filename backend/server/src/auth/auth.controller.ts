import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.login(dto, res);
    return { accessToken: out.accessToken, user: out.user }; // cookies setados no service
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.refresh(req, res);
    return { accessToken: out.accessToken };
  }

  @Post("logout")
  @HttpCode(200)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req, res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @HttpCode(200)
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  // alias de compatibilidade
  @UseGuards(JwtAuthGuard)
  @Get("get")
  @HttpCode(200)
  async get(@Req() req: any) {
    return this.auth.me(req.user.id);
  }
}
