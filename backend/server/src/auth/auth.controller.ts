<<<<<<< HEAD
import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.login(dto, res); // mantém 2 args, conforme teu controller original
    return { accessToken: out.accessToken, user: out.user };
  }

  @Post('refresh')
=======
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
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
  @HttpCode(200)
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    const out = await this.auth.refresh(req, res);
    return { accessToken: out.accessToken };
  }

<<<<<<< HEAD
  @Post('logout')
=======
  @Post("logout")
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
  @HttpCode(200)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(req, res);
    return { ok: true };
  }

  @UseGuards(JwtAuthGuard)
<<<<<<< HEAD
  @Get('me')
=======
  @Get("me")
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
  @HttpCode(200)
  async me(@Req() req: any) {
    return this.auth.me(req.user.id);
  }

  // alias de compatibilidade
  @UseGuards(JwtAuthGuard)
<<<<<<< HEAD
  @Get('get')
=======
  @Get("get")
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
  @HttpCode(200)
  async get(@Req() req: any) {
    return this.auth.me(req.user.id);
  }
}
