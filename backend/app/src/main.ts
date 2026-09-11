// Unified Logistics Backend Main Entrypoint - Phase 2 Finalized
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPaths = [
  path.join(process.cwd(), 'backend', 'app', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(p));
      for (const key in parsed) {
        if (!process.env[key] || process.env[key] === '') {
          process.env[key] = parsed[key];
        }
      }
    } catch (err) {
      console.error(`Failed to parse .env at ${p}:`, err);
    }
  }
}

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Set payload limits for Base64 document & profile photo uploads (5MB)
  const { json, urlencoded } = require('express');
  app.use(json({ limit: '5mb' }));
  app.use(urlencoded({ limit: '5mb', extended: true }));

  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });
  app.useStaticAssets(uploadsDir, { prefix: '/api/uploads/' });

  app.enableCors();
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Set global route prefix to /api for all client apps
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Unified Logistics Platform API')
    .setDescription('Consolidated NestJS Backend API Documentation for GMU Hub, SHG App, and Transporter App')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Unified Logistics Backend is running on: http://localhost:${port}/api`);
  console.log(`📑 Swagger Documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
