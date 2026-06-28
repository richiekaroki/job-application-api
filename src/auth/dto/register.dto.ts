import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/user.entity';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.APPLICANT })
  @IsEnum(UserRole)
  role: UserRole;
}
