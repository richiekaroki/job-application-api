import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { UsersService } from '../users/users.service';
import { RegisterWebhookDto } from './dto/register-webhook.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('webhooks')
@Controller('webhooks')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.EMPLOYER, UserRole.SUPER_ADMIN)
@ApiBearerAuth('access-token')
export class WebhooksController {
  constructor(
    private readonly webhooksService: WebhooksService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a webhook URL — employer+' })
  @ApiResponse({ status: 200, description: 'Webhook URL registered.' })
  async register(@Body() dto: RegisterWebhookDto, @CurrentUser() user: User) {
    const updated = await this.usersService.updateWebhookUrl(
      user.id,
      dto.webhookUrl,
    );
    return { webhookUrl: updated.webhookUrl };
  }

  @Get('logs')
  @ApiOperation({ summary: 'View webhook delivery logs — employer+' })
  @ApiResponse({ status: 200, description: 'Delivery logs retrieved.' })
  findLogs(
    @CurrentUser() user: User,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.webhooksService.findLogsForEmployer(user.id, { page, limit });
  }
}
