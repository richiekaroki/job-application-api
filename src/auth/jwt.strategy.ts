import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    // Check Redis blacklist using jti
    const blacklisted = await this.redis.get(`blacklist:${payload.jti}`);
    if (blacklisted) {
      throw new UnauthorizedException({
        code: 'TOKEN_BLACKLISTED',
        message: 'This token has been invalidated. Please log in again.',
      });
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_TOKEN',
        message: 'User no longer exists.',
      });
    }

    return user;
  }
}
