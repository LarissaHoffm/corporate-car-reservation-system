import { Module } from '@nestjs/common';

import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaService } from '../infra/prisma.service';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, PrismaService],
  exports: [ReportsService],
})
export class ReportsModule {}
