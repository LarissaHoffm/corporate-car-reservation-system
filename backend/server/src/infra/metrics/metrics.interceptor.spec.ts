import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

import { MetricsInterceptor } from './metrics.interceptor';
import { HttpMetricLabels } from './metrics.service';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let observeRequest: jest.Mock<void, [HttpMetricLabels, number]>;

  beforeEach(() => {
    observeRequest = jest.fn();
    interceptor = new MetricsInterceptor({
      observeRequest,
    } as any);
  });

  const makeExecutionContext = (statusCode = 200): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'GET',
          route: { path: '/test-route' },
          url: '/test-route',
        }),
        getResponse: () => ({
          statusCode,
        }),
      }),
    }) as unknown as ExecutionContext;

  it('deve registrar métricas em requisições bem-sucedidas', async () => {
    const ctx = makeExecutionContext(200);
    const next: CallHandler = {
      handle: () => of('ok'),
    };

    await lastValueFrom(interceptor.intercept(ctx, next));

    expect(observeRequest).toHaveBeenCalledTimes(1);

    const [labels, duration] = observeRequest.mock.calls[0];

    expect(labels.method).toBe('GET');
    expect(labels.route).toBe('/test-route');
    expect(labels.status_code).toBe('200');
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it('deve registrar métricas também quando ocorre erro', async () => {
    const ctx = makeExecutionContext(500);
    const next: CallHandler = {
      handle: () =>
        throwError(() => Object.assign(new Error('fail'), { status: 500 })),
    };

    await expect(
      lastValueFrom(interceptor.intercept(ctx, next)),
    ).rejects.toThrow('fail');

    expect(observeRequest).toHaveBeenCalledTimes(1);

    const [labels, duration] = observeRequest.mock.calls[0];

    expect(labels.method).toBe('GET');
    expect(labels.route).toBe('/test-route');
    expect(labels.status_code).toBe('500');
    expect(typeof duration).toBe('number');
  });
});
