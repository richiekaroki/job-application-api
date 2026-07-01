/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import Redis from 'ioredis';

import { User } from '../users/user.entity';
import { RefreshToken } from './refresh-token.entity';
import { UsersService } from '../users/users.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
    });

    await this.usersRepo.save(user);
    const { passwordHash: _, ...result } = user;
    return result;
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    const tokens = await this.generateTokens(user);
    const { passwordHash: _, ...userResult } = user;
    return { user: userResult, ...tokens };
  }

  // ─── Refresh ─────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    // Verify the refresh token signature
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_INVALID',
        message: 'Refresh token is invalid or expired.',
      });
    }

    // Check DB — must exist and not be revoked
    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const stored = await this.refreshTokenRepo.findOne({
      where: { user: { id: payload.sub }, revoked: false },
      relations: { user: true },
      order: { expiresAt: 'DESC' },
    });

    if (!stored || stored.revoked) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_INVALID',
        message: 'Refresh token has been revoked.',
      });
    }

    // Verify token matches stored hash
    const tokenMatches = await bcrypt.compare(refreshToken, stored.tokenHash);
    if (!tokenMatches) {
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_INVALID',
        message: 'Refresh token mismatch.',
      });
    }

    // Rotate — revoke old, issue new
    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    const user = await this.usersService.findById(payload.sub);
    const tokens = await this.generateTokens(user);
    return tokens;
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  async logout(user: User, accessToken: string) {
    // Decode to get jti and expiry
    const payload = this.jwtService.decode(accessToken);

    if (payload?.jti) {
      const ttl = payload.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        // Blacklist the jti in Redis until token naturally expires
        await this.redis.set(`blacklist:${payload.jti}`, '1', 'EX', ttl);
      }
    }

    // Revoke all refresh tokens for this user
    await this.refreshTokenRepo.update(
      { user: { id: user.id }, revoked: false },
      { revoked: true },
    );

    return { message: 'Logged out successfully.' };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async generateTokens(user: User) {
    const jti = randomUUID();

    const accessToken = this.jwtService.sign(
      { sub: user.id, email: user.email, role: user.role, jti },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    const refreshTokenValue = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    // Store hashed refresh token in DB
    const tokenHash = await bcrypt.hash(refreshTokenValue, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const refreshToken = this.refreshTokenRepo.create({
      user,
      tokenHash,
      expiresAt,
      revoked: false,
    });
    await this.refreshTokenRepo.save(refreshToken);

    return { accessToken, refreshToken: refreshTokenValue };
  }
}
