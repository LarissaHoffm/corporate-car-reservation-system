import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaService } from '../infra/prisma.service';
import { RedisService } from '../infra/redis.service';
import { UsersModule } from '../users/users.module';


@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule,
    JwtModule.register({}), 
    ThrottlerModule.forRoot([
      {
        ttl: 10, // 10s
        limit: 5, // 5 tentativas em 10s 
      },
    ]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    RedisService,
    { provide: APP_GUARD, useClass: ThrottlerGuard }, // global
  ],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule {}
