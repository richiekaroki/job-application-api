import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from './job.entity';
import { User, UserRole } from '../users/user.entity';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { paginated } from '../common/interceptors/transform.interceptor';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepo: Repository<Job>,
  ) {}

  async create(dto: CreateJobDto, user: User): Promise<Job> {
    const job = this.jobsRepo.create({
      title: dto.title,
      description: dto.description,
      location: dto.location,
      postedBy: user,
      status: JobStatus.OPEN,
    });
    return this.jobsRepo.save(job);
  }

  async findAll(query: QueryJobsDto) {
    const { page = 1, limit = 10, title, location, status, postedAfter } = query;

    const qb = this.jobsRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.postedBy', 'user')
      .select([
        'job.id',
        'job.title',
        'job.description',
        'job.location',
        'job.status',
        'job.createdAt',
        'user.id',
        'user.fullName',
        'user.email',
      ])
      .orderBy('job.createdAt', 'DESC');

    if (title) {
      qb.andWhere('job.title ILIKE :title', { title: `%${title}%` });
    }
    if (location) {
      qb.andWhere('job.location = :location', { location });
    }
    if (status) {
      qb.andWhere('job.status = :status', { status });
    }
    if (postedAfter) {
      qb.andWhere('job.createdAt >= :postedAfter', { postedAfter: new Date(postedAfter) });
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

  async findOne(id: string): Promise<Job> {
    const job = await this.jobsRepo.findOne({
      where: { id },
      relations: { postedBy: true },
    });
    if (!job) {
      throw new NotFoundException({
        code: 'JOB_NOT_FOUND',
        message: 'Job not found.',
      });
    }
    return job;
  }

  async update(id: string, dto: UpdateJobDto, user: User): Promise<Job> {
    const job = await this.findOne(id);

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      job.postedBy.id !== user.id
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You can only update your own job postings.',
      });
    }

    Object.assign(job, dto);
    return this.jobsRepo.save(job);
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const job = await this.findOne(id);

    if (
      user.role !== UserRole.SUPER_ADMIN &&
      job.postedBy.id !== user.id
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You can only delete your own job postings.',
      });
    }

    await this.jobsRepo.remove(job);
    return { message: 'Job deleted successfully.' };
  }
}
