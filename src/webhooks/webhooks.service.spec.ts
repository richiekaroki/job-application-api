import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { WebhooksService } from './webhooks.service';
import { WebhookLog } from './webhook-log.entity';
import { Application } from '../applications/application.entity';
import { User } from '../users/user.entity';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as unknown as jest.Mocked<{ post: jest.Mock }>;

describe('WebhooksService', () => {
  let service: WebhooksService;

  const mockWebhookLogRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    getCount: jest.fn(),
  };

  const mockAppRepo = {
    findOne: jest.fn(),
  };

  const mockUsersRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-webhook-secret'),
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    getMany: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        {
          provide: getRepositoryToken(WebhookLog),
          useValue: mockWebhookLogRepo,
        },
        { provide: getRepositoryToken(Application), useValue: mockAppRepo },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
    mockWebhookLogRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => jest.clearAllMocks());

  describe('handleStatusChanged', () => {
    it('should deliver webhook to employer with webhookUrl', async () => {
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'employer-1',
        webhookUrl: 'https://hooks.test.com',
      });
      mockedAxios.post.mockResolvedValue({ status: 200 });
      mockWebhookLogRepo.create.mockReturnValue({});
      mockWebhookLogRepo.save.mockResolvedValue({});

      await service.handleStatusChanged({
        applicationId: 'app-1',
        jobId: 'job-1',
        applicantId: 'applicant-1',
        employerId: 'employer-1',
        status: 'shortlisted',
        timestamp: new Date().toISOString(),
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://hooks.test.com',
        expect.any(Object),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Webhook-Signature': expect.stringContaining('sha256='),
          }),
        }),
      );
    });

    it('should skip if employer has no webhookUrl', async () => {
      mockUsersRepo.findOne.mockResolvedValue({
        id: 'employer-1',
        webhookUrl: null,
      });

      await service.handleStatusChanged({
        applicationId: 'app-1',
        jobId: 'job-1',
        applicantId: 'applicant-1',
        employerId: 'employer-1',
        status: 'shortlisted',
        timestamp: new Date().toISOString(),
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });
});
