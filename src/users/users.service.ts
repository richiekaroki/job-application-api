import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true,
        createdAt: true,
      },
    });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        webhookUrl: true,
        createdAt: true,
      },
    });
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find({
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async updateRole(
    id: string,
    role: UserRole,
    performedBy: string,
  ): Promise<User> {
    const user = await this.findById(id);

    // Prevent self-demotion
    if (user.id === performedBy) {
      throw new ForbiddenException({
        code: 'CANNOT_CHANGE_OWN_ROLE',
        message: 'You cannot change your own role.',
      });
    }

    // Prevent demoting the last super_admin
    if (user.role === UserRole.SUPER_ADMIN && role !== UserRole.SUPER_ADMIN) {
      const adminCount = await this.usersRepo.count({
        where: { role: UserRole.SUPER_ADMIN },
      });
      if (adminCount <= 1) {
        throw new ForbiddenException({
          code: 'LAST_ADMIN',
          message: 'Cannot demote the last super_admin.',
        });
      }
    }

    user.role = role;
    return this.usersRepo.save(user);
  }

  async updateWebhookUrl(id: string, webhookUrl: string): Promise<User> {
    const user = await this.findById(id);
    user.webhookUrl = webhookUrl;
    return this.usersRepo.save(user);
  }
}
