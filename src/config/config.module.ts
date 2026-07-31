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

        DATABASE_URL: Joi.string().optional(),
        DB_HOST: Joi.string().optional(),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().optional(),
        DB_PASSWORD: Joi.string().optional(),
        DB_NAME: Joi.string().optional(),

        REDIS_URL: Joi.string().optional(),
        REDIS_HOST: Joi.string().optional(),
        REDIS_PORT: Joi.number().default(6379),

        JWT_SECRET: Joi.string().min(32).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

        WEBHOOK_SECRET: Joi.string().required(),

        THROTTLE_TTL: Joi.number().default(60000),
        THROTTLE_LIMIT: Joi.number().default(100),
        AUTH_THROTTLE_LIMIT: Joi.number().default(10),
      }).custom((value, helpers) => {
        const hasDatabaseUrl = !!value.DATABASE_URL;
        const hasDbIndividual = value.DB_HOST && value.DB_USERNAME && value.DB_PASSWORD && value.DB_NAME;
        if (!hasDatabaseUrl && !hasDbIndividual) {
          return helpers.error('any.invalid', {
            message: 'Provide either DATABASE_URL or all of DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME',
          });
        }
        const hasRedisUrl = !!value.REDIS_URL;
        const hasRedisIndividual = value.REDIS_HOST;
        if (!hasRedisUrl && !hasRedisIndividual) {
          return helpers.error('any.invalid', {
            message: 'Provide either REDIS_URL or REDIS_HOST',
          });
        }
        return value;
      }),
    }),
  ],
})
export class AppConfigModule {}
