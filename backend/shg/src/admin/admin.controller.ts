import { Controller, Get, Patch, Param, Body, UseGuards, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, ApplicationStatus } from '@prisma/client';
import { AdminService } from './admin.service';
import { RejectRequestDto } from './dto/admin.dto';

@ApiTags('Admin Approval')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/requests')
export class AdminController {
  constructor(private adminService: AdminService) { }

  @Get()
  @ApiOperation({ summary: 'Get all signup requests with filtering and pagination' })
  @ApiQuery({ name: 'status', enum: ApplicationStatus, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRequests(
    @Query('status') status?: ApplicationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getPendingRequests(
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @Patch(':requestId/approve')
  @ApiOperation({ summary: 'Approve a signup request' })
  @ApiResponse({ status: 200, description: 'Request approved successfully' })
  async approve(@Param('requestId') requestId: string) {
    return this.adminService.approveRequest(requestId);
  }

  @Patch(':requestId/reject')
  @ApiOperation({ summary: 'Reject a signup request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully' })
  async reject(@Param('requestId') requestId: string, @Body() dto: RejectRequestDto) {
    return this.adminService.rejectRequest(requestId, dto);
  }
}
