import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { Job, JobStatus } from './job.entity';
import { User, UserRole } from '../users/user.entity';

describe('JobsService', () => {
  let service: JobsService;

  const mockJob: Job = {
    id: 'job-uuid-1',
    title: 'Backend Developer',
    description: 'Build APIs',
    location: 'Remote',
    status: JobStatus.OPEN,
    createdAt: new Date(),
    postedBy: null,
  };

  const mockEmployer: User = {
    id: 'employer-uuid-1',
    email: 'employer@test.com',
    passwordHash: '$2b$12$hashed',
    role: UserRole.EMPLOYER,
    fullName: 'Test Employer',
    webhookUrl: null,
    createdAt: new Date(),
  };

  const mockAdmin: User = {
    id: 'admin-uuid-1',
    email: 'admin@test.com',
    passwordHash: '$2b$12$hashed',
    role: UserRole.SUPER_ADMIN,
    fullName: 'Test Admin',
    webhookUrl: null,
    createdAt: new Date(),
  };

  const mockJobsRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    getMany: jest.fn().mockResolvedValue([mockJob]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: mockJobsRepo },
      ],
    }).compile();

    service = module.get<JobsService>(JobsService);
    mockJobsRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new job', async () => {
      mockJobsRepo.create.mockReturnValue(mockJob);
      mockJobsRepo.save.mockResolvedValue(mockJob);

      const result = await service.create(
        {
          title: 'Backend Developer',
          description: 'Build APIs',
          location: 'Remote',
        },
        mockEmployer,
      );

      expect(result).toHaveProperty('id');
      expect(mockJobsRepo.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a job by id', async () => {
      mockJobsRepo.findOne.mockResolvedValue(mockJob);

      const result = await service.findOne('job-uuid-1');
      expect(result.id).toBe('job-uuid-1');
    });

    it('should throw NotFoundException for non-existent job', async () => {
      mockJobsRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update own job as employer', async () => {
      mockJobsRepo.findOne.mockResolvedValue({
        ...mockJob,
        postedBy: mockEmployer,
      });
      mockJobsRepo.save.mockResolvedValue({ ...mockJob, title: 'Updated' });

      const result = await service.update(
        'job-uuid-1',
        { title: 'Updated' },
        mockEmployer,
      );
      expect(result.title).toBe('Updated');
    });

    it('should allow admin to update any job', async () => {
      mockJobsRepo.findOne.mockResolvedValue({
        ...mockJob,
        postedBy: mockEmployer,
      });
      mockJobsRepo.save.mockResolvedValue({
        ...mockJob,
        title: 'Admin Updated',
      });

      const result = await service.update(
        'job-uuid-1',
        { title: 'Admin Updated' },
        mockAdmin,
      );
      expect(result.title).toBe('Admin Updated');
    });

    it('should reject employer updating another employer job', async () => {
      const otherEmployer = { ...mockEmployer, id: 'other-id' };
      mockJobsRepo.findOne.mockResolvedValue({
        ...mockJob,
        postedBy: mockEmployer,
      });

      await expect(
        service.update('job-uuid-1', { title: 'Hacked' }, otherEmployer),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('should delete own job as employer', async () => {
      mockJobsRepo.findOne.mockResolvedValue({
        ...mockJob,
        postedBy: mockEmployer,
      });
      mockJobsRepo.remove.mockResolvedValue(mockJob);

      const result = await service.remove('job-uuid-1', mockEmployer);
      expect(result).toHaveProperty('message');
    });

    it('should reject employer deleting another employer job', async () => {
      const otherEmployer = { ...mockEmployer, id: 'other-id' };
      mockJobsRepo.findOne.mockResolvedValue({
        ...mockJob,
        postedBy: mockEmployer,
      });

      await expect(service.remove('job-uuid-1', otherEmployer)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
