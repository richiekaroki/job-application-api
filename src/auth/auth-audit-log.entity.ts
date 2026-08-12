import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuthEvent {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  REGISTER = 'register',
  LOGOUT = 'logout',
  ACCOUNT_LOCKED = 'account_locked',
  PASSWORD_CHANGE = 'password_change',
}

@Entity('auth_audit_logs')
@Index(['email', 'createdAt'])
@Index(['eventType'])
export class AuthAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', length: 30 })
  eventType: AuthEvent;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;

  @Column({ nullable: true })
  details: string;

  @CreateDateColumn()
  createdAt: Date;
}
