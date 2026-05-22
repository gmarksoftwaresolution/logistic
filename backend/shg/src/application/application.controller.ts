import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApplicationService } from './application.service';
import { GetUser } from '../common/decorators/user.decorator';
import { User } from '@prisma/client';

@ApiTags('Application')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('application')
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current application status' })
  async getStatus(@GetUser() user: User) {
    return this.applicationService.getStatus(user.id);
  }
}
