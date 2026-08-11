import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { LoginAttemptService } from './login-attempt.service';
import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    UsersModule,
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, LoginAttemptService],
  controllers: [AuthController],
  exports: [JwtAuthGuard, JwtStrategy],
})
export class AuthModule {}
