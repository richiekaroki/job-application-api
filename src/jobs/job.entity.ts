import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum JobStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'posted_by' })
  postedBy: User;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  location: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.OPEN })
  status: JobStatus;

  @CreateDateColumn()
  createdAt: Date;
}
