import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({ example: 'Junior API Developer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'Build and maintain RESTful APIs using Node.js.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  description: string;

  @ApiProperty({ example: 'Nairobi, Kenya' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location: string;
}
