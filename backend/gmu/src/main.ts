import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPaths = [
  path.join(process.cwd(), '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(__dirname, '..', '..', '.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    try {
      const parsed = dotenv.parse(fs.readFileSync(p));
      for (const key in parsed) {
        process.env[key] = parsed[key];
      }
    } catch (err) {
      console.error(`Failed to parse .env at ${p}:`, err);
    }
    break;
  }
}

// Globally override Date serialization to output Indian Standard Time (IST) in YYYY-MM-DD HH:mm:ss format
Date.prototype.toJSON = function () {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(this.getTime() + istOffset);
  const pad = (num: number) => String(num).padStart(2, '0');

  const yyyy = istDate.getUTCFullYear();
  const mm = pad(istDate.getUTCMonth() + 1);
  const dd = pad(istDate.getUTCDate());

  const hh = pad(istDate.getUTCHours());
  const min = pad(istDate.getUTCMinutes());
  const ss = pad(istDate.getUTCSeconds());

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
};

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors();

  // Global Interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Global Exception Filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger (Hosted at http://localhost:3001/api)
  const config = new DocumentBuilder()
    .setTitle('GMU Hub Backend API')
    .setDescription('The GMU Hub Backend application API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
