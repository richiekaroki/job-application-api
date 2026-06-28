import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Application } from '../applications/application.entity';

@Entity('webhook_logs')
export class WebhookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Application)
  @JoinColumn({ name: 'application_id' })
  application: Application;

  @Column()
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ nullable: true })
  statusCode: number;

  @CreateDateColumn()
  deliveredAt: Date;
}
