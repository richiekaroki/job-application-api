import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApplicationDto {
  @ApiProperty({ example: 'I am excited to apply for this role...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  coverLetter: string;
}
