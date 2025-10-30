import { Module } from '@nestjs/common';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { PrismaService } from '../infra/prisma.service';

@Module({
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PrismaService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
