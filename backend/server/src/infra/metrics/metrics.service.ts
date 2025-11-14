import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

export type HttpMetricLabels = {
  method: string;
  route: string;
  status_code: string;
};

// Nomes das labels 
type HttpMetricLabelName = keyof HttpMetricLabels;

@Injectable()
export class MetricsService {
  private readonly registry: Registry;
  private readonly httpRequestsTotal: Counter<HttpMetricLabelName>;
  private readonly httpRequestDuration: Histogram<HttpMetricLabelName>;

  constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({
      register: this.registry,
      prefix: 'ccrs_',
    });

    this.httpRequestsTotal = new Counter<HttpMetricLabelName>({
      name: 'ccrs_http_requests_total',
      help: 'Total de requisições HTTP da API ReservCar.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram<HttpMetricLabelName>({
      name: 'ccrs_http_request_duration_seconds',
      help: 'Duração das requisições HTTP em segundos.',
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
  }

  observeRequest(labels: HttpMetricLabels, durationSeconds: number) {
    const metricLabels = labels as Record<HttpMetricLabelName, string>;

    this.httpRequestsTotal.inc(metricLabels);
    this.httpRequestDuration.observe(metricLabels, durationSeconds);
  }

  getRegistry() {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
