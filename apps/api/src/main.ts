import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
const cookieParser = require('cookie-parser');
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { EnvelopeInterceptor } from './common/interceptors/envelope.interceptor';
import { createGlobalValidationPipe } from './common/pipes/validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('port', 4000);
  const corsOrigin = configService.get<string>('corsOrigin', 'http://localhost:5173');

  // Middleware
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'If-Match'],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes, interceptors, and filters
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
  console.log(`🚀 SyncBoard API listening on http://localhost:${port}/api/v1`);
  console.log(`📡 WebSocket server ready on ws://localhost:${port}`);
}

bootstrap();
