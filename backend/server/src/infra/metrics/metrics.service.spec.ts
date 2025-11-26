import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('deve registrar métricas de requisições HTTP e exportá-las', async () => {
    service.observeRequest(
      {
        method: 'GET',
        route: '/test',
        status_code: '200',
      },
      0.123,
    );

    const metrics = await service.getMetrics();

    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('ccrs_http_requests_total');
    expect(metrics).toContain('ccrs_http_request_duration_seconds');
  });

  it('deve expor o registry do prom-client', () => {
    const registry = service.getRegistry();

    expect(registry).toBeDefined();
    expect(typeof registry.metrics).toBe('function');
  });
});
