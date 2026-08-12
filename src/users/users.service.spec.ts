import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserRole } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;

  const mockUser: User = {
    id: 'uuid-1',
    email: 'test@test.com',
    passwordHash: '$2b$12$hashed',
    role: UserRole.APPLICANT,
    fullName: 'Test User',
    webhookUrl: null,
    createdAt: new Date(),
  };

  const mockUsersRepo = {
    find: jest.fn().mockResolvedValue([mockUser]),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findByEmail('test@test.com');
      expect(result.email).toBe('test@test.com');
    });

    it('should return null for non-existent email', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('nobody@test.com');
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return a user by id', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      const result = await service.findById('uuid-1');
      expect(result.id).toBe('uuid-1');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockUsersRepo.findOne.mockResolvedValue(null);
      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const result = await service.findAll();
      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('updateRole', () => {
    it('should update user role', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      mockUsersRepo.save.mockResolvedValue({
        ...mockUser,
        role: UserRole.EMPLOYER,
      });

      const result = await service.updateRole(
        'uuid-1',
        UserRole.EMPLOYER,
        'admin-1',
      );
      expect(result.role).toBe(UserRole.EMPLOYER);
    });
  });

  describe('updateWebhookUrl', () => {
    it('should update webhook URL', async () => {
      mockUsersRepo.findOne.mockResolvedValue(mockUser);
      mockUsersRepo.save.mockResolvedValue({
        ...mockUser,
        webhookUrl: 'https://hooks.test.com',
      });

      const result = await service.updateWebhookUrl(
        'uuid-1',
        'https://hooks.test.com',
      );
      expect(result.webhookUrl).toBe('https://hooks.test.com');
    });
  });
});
