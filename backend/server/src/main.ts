import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { mkdirSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const cfg = app.get(ConfigService);

  app.use(helmet());
  app.use(cookieParser());

  const uploadsDir = join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  app.enableCors({
    origin: cfg.get('FRONTEND_URL') ?? 'http://localhost:5173',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const SWAGGER_SERVER_BASE = process.env.SWAGGER_SERVER_BASE ?? '/api';

  const swaggerCfg = new DocumentBuilder()
    .setTitle('ReservCar API')
    .setDescription('Auth + RBAC + CSRF double-submit')
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header', name: 'Authorization' },
      'access-token',
    )
    .addCookieAuth('refreshToken', { type: 'apiKey', in: 'cookie' })
    .addServer(SWAGGER_SERVER_BASE)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      withCredentials: true,
    },
  });

  const port = Number(cfg.get('PORT') ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API on http://localhost:${port}/docs (Swagger base: ${SWAGGER_SERVER_BASE})`);
}
bootstrap();
