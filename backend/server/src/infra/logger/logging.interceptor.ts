import { CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();
    const meta = {
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id,
      tenantId: req.user?.tenantId,
      ip: req.ip,
      agent: req.headers['user-agent'],
      corr: req.headers['x-correlation-id'],
    };

    this.logger.info({ msg: 'request_in', ...meta, t: start });

    return next.handle().pipe(
      tap({
        next: () => this.logger.info({ msg: 'request_out', ...meta, ms: Date.now() - start }),
        error: (err) => this.logger.error({ msg: 'request_error', ...meta, ms: Date.now() - start, err }),
      })
    );
  }
}
