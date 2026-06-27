import { Controller, Get, Patch, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityManagementService } from './community-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Community Management')
@Controller('community')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunityManagementController {
  constructor(private readonly service: CommunityManagementService) {}

  @Get('shg')
  @ApiOperation({ summary: 'Get all SHG members' })
  async getShg() {
    return this.service.getCommunityMembers('SHG', null);
  }

  @Get('individual')
  @ApiOperation({ summary: 'Get all Individual members' })
  async getIndividual() {
    return this.service.getCommunityMembers('INDIVIDUAL', null);
  }

  @Get('shg/requests')
  @ApiOperation({ summary: 'Get all pending SHG approval requests' })
  async getShgRequests() {
    return this.service.getShgRequests();
  }

  @Get('shg/members')
  @ApiOperation({ summary: 'Get all approved SHG members' })
  async getShgMembers() {
    return this.service.getShgMembers();
  }

  @Get('shg/rejected')
  @ApiOperation({ summary: 'Get all rejected SHG requests' })
  async getShgRejected() {
    return this.service.getShgRejected();
  }

  @Get('individual/requests')
  @ApiOperation({ summary: 'Get all pending Individual approval requests' })
  async getIndividualRequests() {
    return this.service.getIndividualRequests();
  }

  @Get('individual/members')
  @ApiOperation({ summary: 'Get all approved Individual members' })
  async getIndividualMembers() {
    return this.service.getIndividualMembers();
  }

  @Get('individual/rejected')
  @ApiOperation({ summary: 'Get all rejected Individual requests' })
  async getIndividualRejected() {
    return this.service.getIndividualRejected();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complete registration information of a community member by ID' })
  async getMemberById(@Param('id') id: string) {
    return this.service.getMemberById(id);
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Approve a community member request via PATCH' })
  async approveMember(@Param('id') id: string) {
    return this.service.approveMember(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a community member request via POST' })
  async approveMemberPost(@Param('id') id: string) {
    return this.service.approveMember(id);
  }

  @Patch(':id/reject')
  @ApiOperation({ summary: 'Reject a community member request via PATCH' })
  async rejectMember(@Param('id') id: string) {
    return this.service.rejectMember(id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a community member request via POST' })
  async rejectMemberPost(@Param('id') id: string) {
    return this.service.rejectMember(id);
  }
}
