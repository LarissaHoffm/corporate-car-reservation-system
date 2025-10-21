import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AUDIT_ACTION } from './audit.decorator';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const meta = this.reflector.get(AUDIT_ACTION, ctx.getHandler());
    if (!meta) return next.handle();

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: req.user?.tenantId ?? null,
              userId: req.user?.id ?? null,
              action: meta.action,
              entity: meta.entity,
              // upload não retorna id → tudo bem ficar null
              entityId: result?.id ?? req.params?.id ?? null,
              ip: req.ip,
              userAgent: req.headers['user-agent'],
              metadata: { body: req.body, params: req.params, query: req.query },
            },
          });
        } catch (e) {
          // não derruba a request se falhar auditoria
        }
      }),
    );
  }
}
