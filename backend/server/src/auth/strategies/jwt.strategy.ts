import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

function cookieExtractor(req: Request) {
  return (req && req.cookies && req.cookies['accessToken']) || null; // opcional
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(cfg: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(), // header (padrão do front)
        cookieExtractor, // opcional: se algum endpoint usar cookie de access
      ]),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_ACCESS_SECRET'),
    });
  }
  async validate(payload: any) {
    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
