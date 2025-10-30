import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    // Fallback: se não veio Authorization, tenta pegar dos cookies httpOnly
    if (!req.headers?.authorization) {
      const token =
        req.cookies?.accessToken ||
        req.signedCookies?.accessToken ||
        req.cookies?.access_token; // compat
      if (token) {
        req.headers.authorization = `Bearer ${token}`;
      }
    }

    return super.canActivate(context) as any;
  }
}
