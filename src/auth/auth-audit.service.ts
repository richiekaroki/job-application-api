import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthAuditLog, AuthEvent } from './auth-audit-log.entity';

@Injectable()
export class AuthAuditService {
  constructor(
    @InjectRepository(AuthAuditLog)
    private readonly auditRepo: Repository<AuthAuditLog>,
  ) {}

  async log(params: {
    email: string;
    eventType: AuthEvent;
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: string;
  }): Promise<void> {
    const log = this.auditRepo.create({
      email: params.email,
      eventType: params.eventType,
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
    });
    await this.auditRepo.save(log);
  }

  async findByEmail(email: string, limit = 50): Promise<AuthAuditLog[]> {
    return this.auditRepo.find({
      where: { email },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
