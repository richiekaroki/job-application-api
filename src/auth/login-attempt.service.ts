import { Injectable, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class LoginAttemptService {
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_TTL = 900;
  private readonly PREFIX = 'login_attempts:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async recordFailedAttempt(email: string): Promise<{
    locked: boolean;
    attemptsRemaining: number;
  }> {
    const key = `${this.PREFIX}${email}`;
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, this.LOCKOUT_TTL);
    }

    return {
      locked: attempts >= this.MAX_ATTEMPTS,
      attemptsRemaining: Math.max(0, this.MAX_ATTEMPTS - attempts),
    };
  }

  async isLocked(email: string): Promise<boolean> {
    const key = `${this.PREFIX}${email}`;
    const attempts = await this.redis.get(key);
    return attempts !== null && parseInt(attempts, 10) >= this.MAX_ATTEMPTS;
  }

  async resetAttempts(email: string): Promise<void> {
    const key = `${this.PREFIX}${email}`;
    await this.redis.del(key);
  }
}
