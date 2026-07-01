import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'Junior API Developer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Build and maintain RESTful APIs using Node.js.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Nairobi, Kenya' })
  @IsString()
  @IsNotEmpty()
  location: string;
}
