import { Injectable, NotFoundException } from '@nestjs/common';
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
    return this.usersRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user)
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found.',
      });
    return user;
  }

  async findAll(): Promise<User[]> {
    return this.usersRepo.find();
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    const user = await this.findById(id);
    user.role = role;
    return this.usersRepo.save(user);
  }

  async updateWebhookUrl(id: string, webhookUrl: string): Promise<User> {
    const user = await this.findById(id);
    user.webhookUrl = webhookUrl;
    return this.usersRepo.save(user);
  }
}
