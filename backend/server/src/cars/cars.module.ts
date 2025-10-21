import { Module } from '@nestjs/common';
import { CarsController } from './cars.controller';
import { CarsService } from './cars.service';
import { PrismaService } from '../infra/prisma.service';

@Module({
  controllers: [CarsController],
  providers: [CarsService, PrismaService],
  exports: [CarsService],
})
export class CarsModule {}
