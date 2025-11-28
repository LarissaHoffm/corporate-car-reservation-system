import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';

import { MetricsService } from '../metrics/metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  async getMetrics(@Res() res: Response) {
    const data = await this.metrics.getMetrics();

    res.setHeader('Content-Type', this.metrics.getRegistry().contentType);
    res.send(data);
  }
}
