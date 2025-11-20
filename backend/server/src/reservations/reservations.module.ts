import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { PrismaService } from '../infra/prisma.service';

@Module({
  imports: [],
  controllers: [ReservationsController],
  providers: [ReservationsService, PrismaService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
