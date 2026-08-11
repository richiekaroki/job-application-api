import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Module } from '@nestjs/common';
import { writeFileSync } from 'fs';

import { AuthController } from '../src/auth/auth.controller';
import { JobsController } from '../src/jobs/jobs.controller';
import { ApplicationsController } from '../src/applications/applications.controller';
import { WebhooksController } from '../src/webhooks/webhooks.controller';
import { AdminController } from '../src/admin/admin.controller';

const MockAuthService = { login() {}, register() {}, refreshTokens() {}, logout() {} };
const MockJobsService = { findAll() {}, findOne() {}, create() {}, update() {}, remove() {} };
const MockApplicationsService = { findAll() {}, findOne() {}, apply() {}, updateStatus() {} };
const MockWebhooksService = { getLogs() {} };
const MockUsersService = { findAll() {}, updateWebhookUrl() {} };

@Module({
  controllers: [AuthController, JobsController, ApplicationsController, WebhooksController, AdminController],
  providers: [
    { provide: 'AuthService', useValue: MockAuthService },
    { provide: 'JobsService', useValue: MockJobsService },
    { provide: 'ApplicationsService', useValue: MockApplicationsService },
    { provide: 'WebhooksService', useValue: MockWebhooksService },
    { provide: 'UsersService', useValue: MockUsersService },
  ],
})
class StandaloneAppModule {}

async function run() {
  const app = await NestFactory.createApplicationContext(StandaloneAppModule, { logger: false });

  const doc = new DocumentBuilder()
    .setTitle('Job Applications API')
    .setDescription('Production-grade API for managing job postings, applications, and recruitment workflows.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addTag('auth', 'Authentication & token management')
    .addTag('jobs', 'Job postings')
    .addTag('applications', 'Job applications')
    .addTag('webhooks', 'Webhook registration & logs')
    .addTag('admin', 'User management (super_admin only)')
    .build();

  const document = SwaggerModule.createDocument(app as any, doc);
  writeFileSync('swagger.json', JSON.stringify(document, null, 2));
  console.log(`swagger.json exported — ${Object.keys(document.paths).length} endpoints`);
  await app.close();
}

setTimeout(() => { process.exit(0); }, 15000);
run().catch(e => { console.error(e); process.exit(1); });
