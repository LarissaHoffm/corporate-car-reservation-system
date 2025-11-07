import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { AUDIT_ACTION } from './audit.decorator';
import { PrismaService } from '../prisma.service';

function redact(obj: any): any {
  const SENSITIVE_KEYS = new Set([
    'password',
    'currentPassword',
    'newPassword',
    'confirmPassword',
    'authorization',
    'Authorization',
    'accessToken',
    'refreshToken',
    'token',
  ]);

  const seen = new WeakSet();

  const walk = (v: any): any => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v)) return '[circular]';
    seen.add(v);

    if (Array.isArray(v)) return v.map(walk);

    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      if (SENSITIVE_KEYS.has(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = walk(val);
      }
    }
    return out;
  };

  try {
    return walk(obj);
  } catch {
    return '[unserializable]';
  }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService, private reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const res = ctx.switchToHttp().getResponse();
    const meta = this.reflector.get(AUDIT_ACTION, ctx.getHandler());
    if (!meta) return next.handle();

    const startedAt = Date.now();

    const baseData = {
      tenantId: req.user?.tenantId ?? null,
      userId: req.user?.id ?? null,
      action: meta.action as string,
      entity: (meta.entity as string) ?? null,
      entityId: req.params?.id ?? null,
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
      baseMeta: {
        method: req.method,
        path: req.originalUrl || req.url,
        requestId:
          (req.headers['x-request-id'] as string | undefined) ||
          (req.headers['x-correlation-id'] as string | undefined) ||
          null,
      },
    };

    return next.handle().pipe(
      tap(async (result) => {
        try {
          await this.prisma.auditLog.create({
            data: {
              tenantId: baseData.tenantId,
              userId: baseData.userId,
              action: baseData.action,
              entity: baseData.entity,
              entityId: (result?.id ?? baseData.entityId) || null,
              ip: baseData.ip,
              userAgent: baseData.userAgent,
              metadata: {
                ...baseData.baseMeta,
                status: res?.statusCode ?? 200,
                durationMs: Date.now() - startedAt,
                body: redact(req.body),
                params: redact(req.params),
                query: redact(req.query),
                result: redact(result),
              },
            },
          });
        } catch {
        }
      }),
      catchError((err) => {
        // registra falha também
        (async () => {
          try {
            await this.prisma.auditLog.create({
              data: {
                tenantId: baseData.tenantId,
                userId: baseData.userId,
                action: baseData.action,
                entity: baseData.entity,
                entityId: baseData.entityId,
                ip: baseData.ip,
                userAgent: baseData.userAgent,
                metadata: {
                  ...baseData.baseMeta,
                  status: (err?.status ?? err?.statusCode ?? 500),
                  durationMs: Date.now() - startedAt,
                  body: redact(req.body),
                  params: redact(req.params),
                  query: redact(req.query),
                  error: {
                    name: err?.name,
                    message: err?.message,
                  },
                },
              },
            });
          } catch {
            // ignora erro de auditoria
          }
        })();

        return throwError(() => err);
      }),
    );
  }
}
