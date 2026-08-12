import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginAttemptService } from './login-attempt.service';
import { User, UserRole } from '../users/user.entity';
import { AuthAuditService } from './auth-audit.service';
import { RefreshToken } from './refresh-token.entity';
import { REDIS_CLIENT } from '../redis/redis.module';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser: User = {
    id: 'uuid-1',
    email: 'test@test.com',
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.APPLICANT,
    fullName: 'Test User',
    webhookUrl: null,
    createdAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
  };

  const mockUserRepo = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockRefreshTokenRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret-min-32-characters-long',
        JWT_REFRESH_SECRET: 'test-refresh-secret-min-32-characters',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  const mockLoginAttemptService = {
    isLocked: jest.fn().mockResolvedValue(false),
    recordFailedAttempt: jest
      .fn()
      .mockResolvedValue({ locked: false, attemptsRemaining: 4 }),
    resetAttempts: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuthAuditService = {
    log: jest.fn().mockResolvedValue(undefined),
    findByEmail: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        { provide: LoginAttemptService, useValue: mockLoginAttemptService },
        { provide: AuthAuditService, useValue: mockAuthAuditService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockReturnValue(mockUser);
      mockUserRepo.save.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'test@test.com',
        password: 'Password123!',
        fullName: 'Test User',
      });

      expect(result).toHaveProperty('id');
      expect(result.email).toBe('test@test.com');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });

    it('should throw ConflictException for existing email', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@test.com',
          password: 'Password123!',
          fullName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockLoginAttemptService.isLocked.mockResolvedValue(false);
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@test.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when account is locked', async () => {
      mockLoginAttemptService.isLocked.mockResolvedValue(true);

      await expect(
        service.login({ email: 'locked@test.com', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should blacklist token and revoke refresh tokens', async () => {
      mockJwtService.decode.mockReturnValue({
        jti: 'test-jti',
        exp: 9999999999,
      });
      mockRefreshTokenRepo.update.mockResolvedValue(undefined);

      const result = await service.logout(mockUser, 'Bearer mock-token');

      expect(result).toHaveProperty('message');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'blacklist:test-jti',
        '1',
        'EX',
        expect.any(Number),
      );
      expect(mockRefreshTokenRepo.update).toHaveBeenCalled();
    });
  });
});
