import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { CarsModule } from './cars/cars.module';
import { StationsModule } from './stations/stations.module';
import { ReservationsModule } from './reservations/reservations.module';
import { DocumentsModule } from './documents/documents.module';
import { BranchesModule } from './branches/branches.module';
import { DepartmentsModule } from './departments/departments.module';
import { ChecklistsModule } from './checklists/checklists.module';

import { PrismaService } from './infra/prisma.service';
import { AuditInterceptor } from './infra/audit/audit.interceptor';

import { MetricsService } from './infra/metrics/metrics.service';
import { MetricsInterceptor } from './infra/metrics/metrics.interceptor';
import { MetricsController } from './infra/metrics/metrics.controller';

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
    BranchesModule,
    DepartmentsModule,
    ChecklistsModule,
  ],
  controllers: [
    MetricsController, 
  ],
  providers: [
    PrismaService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
    MetricsService,
  ],
})
export class AppModule {}
