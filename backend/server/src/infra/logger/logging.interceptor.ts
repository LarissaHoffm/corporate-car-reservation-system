import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  LoggerService,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AppLogger } from './winston.logger';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: LoggerService = AppLogger;

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();

    const meta = {
      method: req.method,
      path: req.originalUrl ?? req.url,
      userId: req.user?.id ?? req.user?.sub,
      tenantId: req.user?.tenantId,
      ip: req.ip,
      agent: req.headers['user-agent'],
      corr: req.headers['x-correlation-id'],
    };

    this.logger.log({ msg: 'request_in', ...meta, t: start });

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log({
            msg: 'request_out',
            ...meta,
            ms: Date.now() - start,
          }),
        error: (err) =>
          this.logger.error({
            msg: 'request_error',
            ...meta,
            ms: Date.now() - start,
            err,
          }),
      }),
    );
  }
}
