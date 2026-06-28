import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Job } from '../jobs/job.entity';

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  SHORTLISTED = 'shortlisted',
  REJECTED = 'rejected',
  HIRED = 'hired',
}

@Entity('applications')
@Unique(['job', 'applicant'])
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Job)
  @JoinColumn({ name: 'job_id' })
  job: Job;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'applicant_id' })
  applicant: User;

  @Column('text')
  coverLetter: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
