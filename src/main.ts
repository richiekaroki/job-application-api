import './instrument';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AppLoggerService } from './common/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = app.get(AppLoggerService);

  const prefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(prefix);

  // Security headers — must be registered before other middleware
  app.use(helmet());

  // Body size limit — prevent large payload DoS
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  // CORS — comma-separated list of allowed origins
  // e.g. ALLOWED_ORIGINS=https://app.com,https://admin.app.com
  // Blank = allow all (development convenience)
  const allowedOriginsStr = configService.get<string>('ALLOWED_ORIGINS', '');
  const allowedOrigins = allowedOriginsStr
    ? allowedOriginsStr
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new TransformInterceptor(),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger — only in non-production environments
  if (nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Job Applications API')
      .setDescription(
        'Production-grade API for managing job postings, applications, and recruitment workflows.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addTag('auth', 'Authentication & token management')
      .addTag('jobs', 'Job postings')
      .addTag('applications', 'Job applications')
      .addTag('webhooks', 'Webhook registration & logs')
      .addTag('admin', 'User management (super_admin only)')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`Application running on http://localhost:${port}/${prefix}`);
  if (nodeEnv !== 'production') {
    logger.log(`Swagger UI at http://localhost:${port}/${prefix}/docs`);
  }
}

void bootstrap();
