import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Application, ApplicationStatus } from './application.entity';
import { Job, JobStatus } from '../jobs/job.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { paginated } from '../common/interceptors/transform.interceptor';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application)
    private readonly appRepo: Repository<Application>,
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async apply(
    jobId: string,
    dto: CreateApplicationDto,
    user: User,
  ): Promise<Application> {
    const job = await this.jobsRepo.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found.',
      });
    }

    if (job.status === JobStatus.CLOSED) {
      throw new ForbiddenException({
        code: 'JOB_CLOSED',
        message: 'This job is no longer accepting applications.',
      });
    }

    const existing = await this.appRepo.findOne({
      where: { job: { id: jobId }, applicant: { id: user.id } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'ALREADY_APPLIED',
        message: 'You have already applied for this job.',
      });
    }

    const application = this.appRepo.create({
      job,
      applicant: user,
      coverLetter: dto.coverLetter,
      status: ApplicationStatus.PENDING,
    });

    return this.appRepo.save(application);
  }

  async findAll(query: QueryApplicationsDto) {
    const { page = 1, limit = 10, status } = query;

    const qb = this.appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.job', 'job')
      .leftJoinAndSelect('app.applicant', 'applicant')
      .leftJoinAndSelect('app.reviewedBy', 'reviewedBy')
      .select([
        'app.id',
        'app.status',
        'app.coverLetter',
        'app.createdAt',
        'job.id',
        'job.title',
        'job.location',
        'applicant.id',
        'applicant.fullName',
        'applicant.email',
        'reviewedBy.id',
        'reviewedBy.fullName',
      ])
      .orderBy('app.createdAt', 'DESC');

    if (status) {
      qb.andWhere('app.status = :status', { status });
    }

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

  async findMine(user: User, query: QueryApplicationsDto) {
    const { page = 1, limit = 10, status } = query;

    const qb = this.appRepo
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.job', 'job')
      .select([
        'app.id',
        'app.status',
        'app.coverLetter',
        'app.createdAt',
        'job.id',
        'job.title',
        'job.location',
        'job.status',
      ])
      .where('app.applicant_id = :userId', { userId: user.id })
      .orderBy('app.createdAt', 'DESC');

    if (status) {
      qb.andWhere('app.status = :status', { status });
    }

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

  async updateStatus(
    id: string,
    dto: UpdateStatusDto,
    reviewer: User,
  ): Promise<Application> {
    const application = await this.appRepo.findOne({
      where: { id },
      relations: { job: { postedBy: true }, applicant: true },
    });

    if (!application) {
      throw new NotFoundException({
        code: 'APPLICATION_NOT_FOUND',
        message: 'Application not found.',
      });
    }

    application.status = dto.status;
    application.reviewedBy = reviewer;
    const saved = await this.appRepo.save(application);

    // Emit event for webhook delivery
    this.eventEmitter.emit('application.status_changed', {
      applicationId: application.id,
      jobId: application.job.id,
      applicantId: application.applicant.id,
      employerId: application.job.postedBy.id,
      status: dto.status,
      timestamp: new Date().toISOString(),
    });

    return saved;
  }
}
