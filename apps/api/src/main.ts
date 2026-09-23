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

  // Dynamic CORS configuration supporting all Vercel previews & production subdomains
  app.enableCors({
    origin: (requestOrigin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, server-to-server, curl, Postman)
      if (!requestOrigin) {
        return callback(null, true);
      }

      const explicitList = corsOrigin.split(',').map((o) => o.trim());
      const isExplicit = explicitList.includes(requestOrigin);
      const isVercel = requestOrigin.endsWith('.vercel.app');
      const isRender = requestOrigin.endsWith('.onrender.com');
      const isLocalhost =
        requestOrigin.includes('localhost') || requestOrigin.includes('127.0.0.1');

      if (isExplicit || isVercel || isRender || isLocalhost) {
        return callback(null, true);
      }

      // Permissive fallback for SPA APIs with JWT authentication
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'If-Match',
      'Accept',
    ],
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global pipes, interceptors, and filters
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalInterceptors(new EnvelopeInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 SyncBoard API listening on http://localhost:${port}/api/v1`);
  console.log(`📡 WebSocket server ready on ws://localhost:${port}`);
}

bootstrap();
