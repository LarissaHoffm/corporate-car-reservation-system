import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_META_KEY = 'roles'; // mesmo key usado no decorator @Roles()

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Busca roles exigidos na rota/classe
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(ROLES_META_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // Se a rota NÃO declarou @Roles, NÃO bloqueia (deixa passar)
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user as { role?: string } | undefined;

    // Sem usuário autenticado, bloqueia
    if (!user?.role) return false;

    // Autoriza se o papel do usuário está na lista exigida
    return requiredRoles.includes(user.role);
  }
}
