import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../job.entity';

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Senior API Developer' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Remote' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ enum: JobStatus, example: JobStatus.CLOSED })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}
