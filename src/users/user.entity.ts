/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  EMPLOYER = 'employer',
  RECRUITER = 'recruiter',
  APPLICANT = 'applicant',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  webhookUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
