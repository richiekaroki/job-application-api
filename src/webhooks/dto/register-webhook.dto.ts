import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterWebhookDto {
  @ApiProperty({ example: 'https://your-server.com/hooks/jobs' })
  @IsUrl()
  webhookUrl: string;
}
