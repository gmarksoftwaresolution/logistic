import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApplicationService } from './application.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Application')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('application')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Track application approval status' })
  @ApiResponse({ status: 200, description: 'Application status retrieved' })
  getStatus(@Request() req: any) {
    return this.applicationService.getStatus(req.user.id);
  }
}
