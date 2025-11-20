import { Module } from '@nestjs/common';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';
import { PrismaService } from '../infra/prisma.service';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [ReservationsModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService, PrismaService],
  exports: [ChecklistsService],
})
export class ChecklistsModule {}
