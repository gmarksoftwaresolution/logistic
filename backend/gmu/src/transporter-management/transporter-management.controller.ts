import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransporterManagementService } from './transporter-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Transporter Management')
@Controller('transporters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransporterManagementController {
  constructor(private readonly service: TransporterManagementService) {}

  @Get('route-partners/requests')
  @ApiOperation({ summary: 'Get all pending Route Partner approval requests' })
  async getRoutePartnerRequests() {
    return this.service.getRoutePartnerRequests();
  }

  @Get('route-partners/members')
  @ApiOperation({ summary: 'Get all approved Route Partner transporters' })
  async getRoutePartnerMembers() {
    return this.service.getRoutePartnerMembers();
  }

  @Get('route-partners/rejected')
  @ApiOperation({ summary: 'Get all rejected Route Partner requests' })
  async getRoutePartnerRejected() {
    return this.service.getRoutePartnerRejected();
  }

  @Get('personal/requests')
  @ApiOperation({ summary: 'Get all pending Personal transporter approval requests' })
  async getPersonalRequests() {
    return this.service.getPersonalRequests();
  }

  @Get('personal/members')
  @ApiOperation({ summary: 'Get all approved Personal transporters' })
  async getPersonalMembers() {
    return this.service.getPersonalMembers();
  }

  @Get('personal/rejected')
  @ApiOperation({ summary: 'Get all rejected Personal transporter requests' })
  async getPersonalRejected() {
    return this.service.getPersonalRejected();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complete registration information of a transporter by ID' })
  async getTransporterById(@Param('id') id: string) {
    return this.service.getTransporterById(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a transporter member request' })
  async approveTransporter(@Param('id') id: string) {
    return this.service.approveTransporter(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a transporter member request' })
  async rejectTransporter(@Param('id') id: string) {
    return this.service.rejectTransporter(id);
  }
}
