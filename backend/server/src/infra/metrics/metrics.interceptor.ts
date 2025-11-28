import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';

import { MetricsService, type HttpMetricLabels } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();

    const method = (req.method || 'GET').toUpperCase();
    const route = req.route?.path || req.url || 'unknown';
    const started = process.hrtime.bigint();

    const observe = (status: number) => {
      const durationNs = process.hrtime.bigint() - started;
      const durationSeconds = Number(durationNs) / 1e9;

      const labels: HttpMetricLabels = {
        method,
        route,
        status_code: String(status),
      };

      this.metrics.observeRequest(labels, durationSeconds);
    };

    return next.handle().pipe(
      tap({
        next: () => {
          const res = http.getResponse<Response>();
          const status = res.statusCode ?? 200;
          observe(status);
        },
        error: (err) => {
          const res = http.getResponse<Response>();
          const status = res.statusCode ?? (err as any)?.status ?? 500;
          observe(status);
        },
      }),
    );
  }
}
