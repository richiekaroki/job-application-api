import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import * as bcrypt from 'bcrypt';
import * as Joi from 'joi';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

import { User, UserRole } from '../src/users/user.entity';
import { Job } from '../src/jobs/job.entity';
import { Application } from '../src/applications/application.entity';
import { RefreshToken } from '../src/auth/refresh-token.entity';
import { WebhookLog } from '../src/webhooks/webhook-log.entity';
import { AuthModule } from '../src/auth/auth.module';
import { JobsModule } from '../src/jobs/jobs.module';
import { ApplicationsModule } from '../src/applications/applications.module';
import { AdminModule } from '../src/admin/admin.module';
import { WebhooksModule } from '../src/webhooks/webhooks.module';
import { UsersModule } from '../src/users/users.module';
import { HealthController } from '../src/health.controller';
import { RedisModule } from '../src/redis/redis.module';

const redisStore = new Map<string, string>();

const mockRedis = {
  get: jest
    .fn()
    .mockImplementation((key: string) => redisStore.get(key) ?? null),
  set: jest
    .fn()
    .mockImplementation((key: string, value: string, ..._args: any[]) => {
      redisStore.set(key, value);
      return 'OK';
    }),
  del: jest.fn().mockImplementation((key: string) => {
    redisStore.delete(key);
    return 1;
  }),
  incr: jest.fn().mockImplementation((key: string) => {
    const cur = parseInt(redisStore.get(key) ?? '0', 10);
    redisStore.set(key, String(cur + 1));
    return cur + 1;
  }),
  expire: jest.fn().mockResolvedValue(1),
  call: jest.fn().mockResolvedValue('PONG'),
};

jest.mock('@sentry/nestjs/setup', () => ({
  SentryModule: { forRoot: () => ({ module: class {} }) },
}));
jest.mock('@sentry/nestjs', () => ({ captureException: jest.fn() }));
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedis);
});

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
      ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 100 }] }),
      EventEmitterModule.forRoot(),
      RedisModule,
      UsersModule,
      AuthModule,
      JobsModule,
      ApplicationsModule,
      AdminModule,
      WebhooksModule,
    ],
    controllers: [HealthController],
    providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
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

export interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export async function seedUsers(
  app: INestApplication,
  users: TestUser[],
): Promise<void> {
  const usersRepo: Repository<User> = app.get(getRepositoryToken(User));
  const password = 'Password123!';
  const passwordHash = await bcrypt.hash(password, 12);

  for (const u of users) {
    const existing = await usersRepo.findOne({ where: { email: u.email } });
    if (!existing) {
      await usersRepo.save(
        usersRepo.create({
          email: u.email,
          passwordHash,
          fullName: u.fullName,
          role: u.role,
        }),
      );
    }
  }
}
