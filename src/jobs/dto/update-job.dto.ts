import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '../job.entity';

export class UpdateJobDto {
  @ApiPropertyOptional({ example: 'Senior API Developer' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({ example: 'Remote' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ enum: JobStatus, example: JobStatus.CLOSED })
  @IsEnum(JobStatus)
  @IsOptional()
  status?: JobStatus;
}
