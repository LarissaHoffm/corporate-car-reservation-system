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
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppLogger } from './infra/logger/winston.logger';
import { correlationId } from './infra/logger/correlation.middleware';
import { LoggingInterceptor } from './infra/logger/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  const cfg = app.get(ConfigService);

  app.useLogger(AppLogger);

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  app.use(cookieParser());

  app.use(correlationId());

  // ---------- UPLOADS (documentos em geral) ----------
  const uploadsDir = join(process.cwd(), process.env.UPLOADS_DIR || 'uploads');
  // garante a pasta raiz de uploads (documentos, checklists, etc.)
  mkdirSync(uploadsDir, { recursive: true });

  // serve arquivos estáticos em /uploads
  app.use('/uploads', express.static(uploadsDir));

  // ---------- CORS ----------
  // Origens padrão permitidas (dev + produção)
  const baseOrigins = [
    'http://localhost',
    'http://localhost:5173',
    'http://localhost:4173', // Vite preview
    'http://localhost:3000', // Swagger / API local
    'https://reservcar.app.br', // domínio prod
    'https://www.reservcar.app.br', // domínio com www
  ];

  const originSet = new Set<string>(baseOrigins);

  // Permite complementar via env se precisar
  const envSingle = cfg.get<string>('FRONTEND_URL');
  const envList = cfg.get<string>('FRONTEND_URLS');

  if (envSingle) originSet.add(envSingle);
  if (envList) {
    envList
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach((o) => originSet.add(o));
  }

  app.enableCors({
    origin: (origin, cb) => {
      // chamadas internas (sem Origin) continuam liberadas
      if (!origin || originSet.has(origin)) {
        return cb(null, true);
      }

      // bloqueia tudo que não estiver listado
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-csrf-token',
      'x-correlation-id',
    ],
    exposedHeaders: ['x-correlation-id'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  app.useGlobalInterceptors(new LoggingInterceptor());

  const SWAGGER_SERVER_BASE = process.env.SWAGGER_SERVER_BASE ?? '/api';
  const refreshCookieName =
    process.env.REFRESH_COOKIE_NAME ?? 'rc_refresh_token';

  const swaggerCfg = new DocumentBuilder()
    .setTitle('ReservCar API')
    .setDescription('Auth + RBAC + CSRF double-submit')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
      },
      'access-token',
    )
    .addCookieAuth(refreshCookieName, { type: 'apiKey', in: 'cookie' })
    .addServer(SWAGGER_SERVER_BASE)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true, withCredentials: true },
  });

  const port = Number(cfg.get('PORT') ?? 3000);
  await app.listen(port, '0.0.0.0');
  console.log(
    `🚀 API on http://localhost:${port}/docs (Swagger base: ${SWAGGER_SERVER_BASE})`,
  );
}
bootstrap();
