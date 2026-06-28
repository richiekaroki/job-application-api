import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        API_PREFIX: Joi.string().default('api/v1'),

        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().required(),
        DB_NAME: Joi.string().required(),

        REDIS_HOST: Joi.string().required(),
        REDIS_PORT: Joi.number().default(6379),

        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

        WEBHOOK_SECRET: Joi.string().required(),

        THROTTLE_TTL: Joi.number().default(60000),
        THROTTLE_LIMIT: Joi.number().default(100),
        AUTH_THROTTLE_LIMIT: Joi.number().default(10),
      }),
    }),
  ],
})
export class AppConfigModule {}
