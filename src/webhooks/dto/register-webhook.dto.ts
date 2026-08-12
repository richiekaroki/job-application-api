import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotPrivateUrl } from '../../common/validators/is-not-private-url.validator';

export class RegisterWebhookDto {
  @ApiProperty({ example: 'https://your-server.com/hooks/jobs' })
  @IsUrl()
  @IsNotPrivateUrl()
  webhookUrl: string;
}
