import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let service: jest.Mocked<MetricsService>;

  beforeEach(() => {
    service = {
      getMetrics: jest.fn().mockResolvedValue('metrics-data'),
      getRegistry: jest.fn().mockReturnValue({ contentType: 'text/plain' } as any),
      observeRequest: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;

    controller = new MetricsController(service);
  });

  it('deve retornar métricas no formato Prometheus', async () => {
    const setHeader = jest.fn();
    const send = jest.fn();

    const res = {
      setHeader,
      send,
    } as any;

    await controller.getMetrics(res);

    expect(service.getMetrics).toHaveBeenCalledTimes(1);
    expect(service.getRegistry).toHaveBeenCalledTimes(1);
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain');
    expect(send).toHaveBeenCalledWith('metrics-data');
  });
});
