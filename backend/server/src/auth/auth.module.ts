import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { CsrfController } from './csrf.controller';
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
        ttl: 10,
        limit: 5,
      },
    ]),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    PrismaService,
    RedisService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
  controllers: [AuthController, CsrfController],
  exports: [],
})
export class AuthModule {}
