import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigModule } from './config/config.module';
import { getDatabaseConfig } from './config/database.config';
import { HealthController } from './health.controller';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    AppConfigModule,

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),

    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get<number>('THROTTLE_TTL', 60000),
            limit: configService.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    EventEmitterModule.forRoot(),
    RedisModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
