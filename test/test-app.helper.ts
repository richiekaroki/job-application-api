import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';

import { User } from '../../src/users/user.entity';
import { Job } from '../../src/jobs/job.entity';
import { Application } from '../../src/applications/application.entity';
import { RefreshToken } from '../../src/auth/refresh-token.entity';
import { WebhookLog } from '../../src/webhooks/webhook-log.entity';
import { AuthModule } from '../../src/auth/auth.module';
import { JobsModule } from '../../src/jobs/jobs.module';
import { ApplicationsModule } from '../../src/applications/applications.module';
import { AdminModule } from '../../src/admin/admin.module';
import { WebhooksModule } from '../../src/webhooks/webhooks.module';
import { UsersModule } from '../../src/users/users.module';
import { HealthController } from '../../src/health.controller';

// Mock Redis — no real Redis needed for E2E tests
const mockRedis = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  call: jest.fn().mockResolvedValue('PONG'),
};

jest.mock('../../src/redis/redis.module', () => {
  const actual = jest.requireActual('../../src/redis/redis.module');
  return {
    ...actual,
    RedisModule: {
      global: true,
      module: actual.RedisModule,
      providers: [
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedis,
        },
      ],
      exports: ['REDIS_CLIENT'],
    },
  };
});

// Mock Sentry
jest.mock('@sentry/nestjs/setup', () => ({
  SentryModule: {
    forRoot: () => ({
      module: class SentryMockModule {},
    }),
  },
}));

jest.mock('@sentry/nestjs', () => ({
  captureException: jest.fn(),
}));

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        validationSchema: Joi.object({
          NODE_ENV: Joi.string().default('test'),
          JWT_SECRET: Joi.string().min(32).required(),
          JWT_EXPIRES_IN: Joi.string().default('15m'),
          JWT_REFRESH_SECRET: Joi.string().min(32).required(),
          JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
          WEBHOOK_SECRET: Joi.string().required(),
        }),
      }),
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: [User, Job, Application, RefreshToken, WebhookLog],
        synchronize: true,
      }),
      ThrottlerModule.forRoot({
        throttlers: [{ ttl: 60000, limit: 100 }],
      }),
      EventEmitterModule.forRoot(),
      UsersModule,
      AuthModule,
      JobsModule,
      ApplicationsModule,
      AdminModule,
      WebhooksModule,
    ],
    controllers: [HealthController],
    providers: [
      {
        provide: APP_GUARD,
        useClass: ThrottlerGuard,
      },
    ],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
}
