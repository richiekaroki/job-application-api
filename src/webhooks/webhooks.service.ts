import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import { createHmac } from 'crypto';
import { WebhookLog } from './webhook-log.entity';
import { Application } from '../applications/application.entity';
import { User } from '../users/user.entity';
import { ApplicationStatusChangedEvent } from './events/application-status-changed.event';
import { paginated } from '../common/interceptors/transform.interceptor';

interface QueryLogsParams {
  page?: number;
  limit?: number;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectRepository(WebhookLog)
    private readonly webhookLogRepo: Repository<WebhookLog>,
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  @OnEvent('application.status_changed')
  async handleStatusChanged(
    payload: ApplicationStatusChangedEvent,
  ): Promise<void> {
    const employer = await this.usersRepo.findOne({
      where: { id: payload.employerId },
    });

    if (!employer?.webhookUrl) {
      // No webhook registered — nothing to deliver
      return;
    }

    await this.deliver(employer.webhookUrl, payload);
  }

  private async deliver(
    url: string,
    payload: ApplicationStatusChangedEvent,
    attempt = 1,
  ): Promise<void> {
    const body = {
      event: 'application.status_changed',
      ...payload,
    };

    const signature = this.sign(body);

    try {
      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
        },
        timeout: 5000,
      });

      await this.logDelivery(payload.applicationId, body, response.status);
    } catch (error) {
      const statusCode = this.extractStatusCode(error);

      if (attempt === 1) {
        this.logger.warn(
          `Webhook delivery failed (attempt 1) for application ${payload.applicationId}. Retrying in 5s...`,
        );
        await this.delay(5000);
        return this.deliver(url, payload, attempt + 1);
      }

      this.logger.error(
        `Webhook delivery failed permanently for application ${payload.applicationId} after ${attempt} attempts.`,
      );
      await this.logDelivery(payload.applicationId, body, statusCode);
    }
  }

  private sign(body: Record<string, unknown>): string {
    const secret = this.configService.get<string>('WEBHOOK_SECRET', '');
    return createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
  }

  private extractStatusCode(error: unknown): number | null {
    if (error instanceof AxiosError) {
      return error.response?.status ?? null;
    }
    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async logDelivery(
    applicationId: string,
    payload: Record<string, unknown>,
    statusCode: number | null,
  ): Promise<void> {
    const application = await this.appRepo.findOne({
      where: { id: applicationId },
    });
    if (!application) return;

    const log = this.webhookLogRepo.create({
      application,
      eventType: 'application.status_changed',
      payload,
      statusCode: statusCode ?? undefined,
    });

    await this.webhookLogRepo.save(log);
  }

  async findLogsForEmployer(employerId: string, query: QueryLogsParams) {
    const { page = 1, limit = 10 } = query;

    const qb = this.webhookLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.application', 'application')
      .leftJoinAndSelect('application.job', 'job')
      .where('job.posted_by = :employerId', { employerId })
      .orderBy('log.deliveredAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return paginated(data, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  }
}
