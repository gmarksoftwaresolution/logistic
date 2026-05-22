import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody, ApiProperty } from '@nestjs/swagger';

import { AdminService } from './admin.service';
import { ApplicationStatus, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class RejectionDto {
  @ApiProperty({ example: 'Invalid documents', description: 'Reason for rejecting the application' })
  @IsNotEmpty()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  rejectionReason: string;
}

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('api/admin/requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of transporter applications' })
  @ApiQuery({ name: 'status', enum: ApplicationStatus, required: false })
  @ApiResponse({ status: 200, description: 'Applications retrieved successfully' })
  getRequests(@Query('status') status: ApplicationStatus) {
    return this.adminService.getRequests(status);
  }

  @Patch(':requestId/approve')
  @ApiOperation({ summary: 'Approve a transporter application' })
  @ApiResponse({ status: 200, description: 'Application approved successfully' })
  approveRequest(@Param('requestId', ParseIntPipe) requestId: number) {
    return this.adminService.approveRequest(requestId);
  }

  @Patch(':requestId/reject')
  @ApiOperation({ summary: 'Reject a transporter application' })
  @ApiBody({ type: RejectionDto })
  @ApiResponse({ status: 200, description: 'Application rejected successfully' })
  rejectRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: RejectionDto,
  ) {
    return this.adminService.rejectRequest(requestId, dto.rejectionReason);
  }
}
