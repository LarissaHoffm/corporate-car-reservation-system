import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';

import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './infra/audit/audit.interceptor';
import { PrismaService } from './infra/prisma.service'; 
import { CarsModule } from './cars/cars.module';
import { StationsModule } from './stations/stations.module';
import { ReservationsModule } from './reservations/reservations.module';
import { DocumentsModule } from './documents/documents.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UsersModule,
    AuthModule,
    FilesModule,
    HealthModule,
    CarsModule,
    StationsModule,
    ReservationsModule,
    DocumentsModule,
  ],
  providers: [
    PrismaService, 
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
