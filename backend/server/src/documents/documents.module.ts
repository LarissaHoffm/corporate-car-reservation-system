import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../infra/prisma.service';
import { LocalStorage } from '../infra/storage/local.storage';
import { ReservationsModule } from '../reservations/reservations.module';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
    ReservationsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, PrismaService, LocalStorage],
})
export class DocumentsModule {}
