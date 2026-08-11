import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationStatus } from './application.entity';
import { Job, JobStatus } from '../jobs/job.entity';
import { User, UserRole } from '../users/user.entity';

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  const mockEmployer: User = {
    id: 'employer-1',
    email: 'employer@test.com',
    passwordHash: '$2b$12$hashed',
    role: UserRole.EMPLOYER,
    fullName: 'Employer',
    webhookUrl: null,
    createdAt: new Date(),
  };

  const mockApplicant: User = {
    id: 'applicant-1',
    email: 'applicant@test.com',
    passwordHash: '$2b$12$hashed',
    role: UserRole.APPLICANT,
    fullName: 'Applicant',
    webhookUrl: null,
    createdAt: new Date(),
  };

  const mockJob: Job = {
    id: 'job-1',
    title: 'Dev',
    description: 'Build stuff',
    location: 'Remote',
    status: JobStatus.OPEN,
    createdAt: new Date(),
    postedBy: mockEmployer,
  };

  const mockApplication: Application = {
    id: 'app-1',
    job: mockJob,
    applicant: mockApplicant,
    coverLetter: 'Hire me',
    status: ApplicationStatus.PENDING,
    reviewedBy: null,
    createdAt: new Date(),
  };

  const mockAppRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    getCount: jest.fn(),
  };

  const mockJobsRepo = {
    findOne: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    getMany: jest.fn().mockResolvedValue([mockApplication]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: getRepositoryToken(Application), useValue: mockAppRepo },
        { provide: getRepositoryToken(Job), useValue: mockJobsRepo },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    mockAppRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => jest.clearAllMocks());

  describe('apply', () => {
    it('should create an application', async () => {
      mockJobsRepo.findOne.mockResolvedValue(mockJob);
      mockAppRepo.findOne.mockResolvedValue(null);
      mockAppRepo.create.mockReturnValue(mockApplication);
      mockAppRepo.save.mockResolvedValue(mockApplication);

      const result = await service.apply(
        'job-1',
        { coverLetter: 'Hire me' },
        mockApplicant,
      );
      expect(result).toHaveProperty('id');
    });

    it('should reject if job not found', async () => {
      mockJobsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.apply('bad-job', { coverLetter: 'Hi' }, mockApplicant),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject if job is closed', async () => {
      mockJobsRepo.findOne.mockResolvedValue({
        ...mockJob,
        status: JobStatus.CLOSED,
      });
      await expect(
        service.apply('job-1', { coverLetter: 'Hi' }, mockApplicant),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject duplicate application', async () => {
      mockJobsRepo.findOne.mockResolvedValue(mockJob);
      mockAppRepo.findOne.mockResolvedValue(mockApplication);
      await expect(
        service.apply('job-1', { coverLetter: 'Hi' }, mockApplicant),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateStatus', () => {
    it('should update application status', async () => {
      mockAppRepo.findOne.mockResolvedValue({
        ...mockApplication,
        job: mockJob,
      });
      mockAppRepo.save.mockResolvedValue({
        ...mockApplication,
        status: ApplicationStatus.SHORTLISTED,
      });

      const result = await service.updateStatus(
        'app-1',
        { status: ApplicationStatus.SHORTLISTED },
        mockEmployer,
      );
      expect(result.status).toBe(ApplicationStatus.SHORTLISTED);
      expect(mockEventEmitter.emit).toHaveBeenCalled();
    });

    it('should reject if application not found', async () => {
      mockAppRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateStatus(
          'bad-id',
          { status: ApplicationStatus.REJECTED },
          mockEmployer,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject employer updating other employer application', async () => {
      const otherEmployer = { ...mockEmployer, id: 'other-employer' };
      mockAppRepo.findOne.mockResolvedValue({
        ...mockApplication,
        job: mockJob,
      });
      await expect(
        service.updateStatus(
          'app-1',
          { status: ApplicationStatus.REJECTED },
          otherEmployer,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
