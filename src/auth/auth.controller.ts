import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Controller('auth')
@Throttle({ default: { ttl: 60000, limit: 10 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiResponse({ status: 201, description: 'Account created successfully.' })
  @ApiResponse({ status: 409, description: 'Email already taken.' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive access + refresh tokens' })
  @ApiResponse({ status: 200, description: 'Login successful.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange refresh token for a new access token' })
  @ApiResponse({ status: 200, description: 'New access token issued.' })
  @ApiResponse({
    status: 401,
    description: 'Refresh token invalid or expired.',
  })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout — blacklists token and revokes refresh' })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  logout(@CurrentUser() user: User, @Req() req: Request) {
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    return this.authService.logout(user, accessToken);
  }
}
