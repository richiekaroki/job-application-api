import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryApplicationsDto } from './dto/query-applications.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User, UserRole } from '../users/user.entity';

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.EMPLOYER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all applications — recruiter+' })
  @ApiResponse({ status: 200, description: 'Applications retrieved.' })
  findAll(@Query() query: QueryApplicationsDto) {
    return this.applicationsService.findAll(query);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my own applications — applicant' })
  @ApiResponse({ status: 200, description: 'Your applications retrieved.' })
  findMine(@CurrentUser() user: User, @Query() query: QueryApplicationsDto) {
    return this.applicationsService.findMine(user, query);
  }

  @Post(':jobId/apply')
  @UseGuards(RolesGuard)
  @Roles(UserRole.APPLICANT)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Apply to a job — applicant only' })
  @ApiResponse({ status: 201, description: 'Application submitted.' })
  @ApiResponse({ status: 409, description: 'Already applied.' })
  apply(
    @Param('jobId') jobId: string,
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.apply(jobId, dto, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.RECRUITER, UserRole.EMPLOYER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update application status — recruiter+' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  @ApiResponse({ status: 404, description: 'Application not found.' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.applicationsService.updateStatus(id, dto, user);
  }
}
