import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '../application.entity';

export class UpdateStatusDto {
  @ApiProperty({
    enum: ApplicationStatus,
    example: ApplicationStatus.SHORTLISTED,
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
