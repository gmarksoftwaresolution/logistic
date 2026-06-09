import { Controller, Get, Post, UseGuards, Param, ParseIntPipe, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/user.decorator';
import { User, UserRole } from '@prisma/client';
import { OrderService } from './order.service';

@ApiTags('SHG Order Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHG)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  //////////////////////////////////////////////////////
  // NEW CLEAN ARCHITECTURE ENDPOINTS
  //////////////////////////////////////////////////////

  @Get('pickup/assigned')
  @ApiOperation({ summary: 'Get all active pickup assignments for the logged-in SHG' })
  async getAssignedPickups(@GetUser() user: User) {
    return this.orderService.getAssignedPickups(user.id);
  }

  @Post('pickup/:id/accept')
  @ApiOperation({ summary: 'Accept a pickup order' })
  async acceptPickup(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.orderService.acceptPickup(id, user.id);
  }

  @Post('pickup/:id/reject')
  @ApiOperation({ summary: 'Reject a pickup order' })
  async rejectPickup(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('reason') reason?: string
  ) {
    return this.orderService.rejectPickup(id, user.id, reason);
  }

  @Post('pickup/:id/complete')
  @ApiOperation({ summary: 'Mark a pickup order as complete' })
  async completePickup(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.orderService.completePickup(id, user.id);
  }

  @Get('drop/assigned')
  @ApiOperation({ summary: 'Get all active drop-off delivery assignments for the SHG' })
  async getAssignedDrops(@GetUser() user: User) {
    return this.orderService.getAssignedDrops(user.id);
  }

  @Post('drop/:id/accept')
  @ApiOperation({ summary: 'Accept a delivery order' })
  async acceptDrop(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.orderService.acceptDrop(id, user.id);
  }

  @Post('drop/:id/pickup')
  @ApiOperation({ summary: 'Mark a delivery order as picked up from transporter' })
  async pickupDrop(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.orderService.pickupDrop(id, user.id);
  }

  @Post('drop/:id/complete')
  @ApiOperation({ summary: 'Mark a delivery order as complete' })
  async completeDrop(@Param('id', ParseIntPipe) id: number, @GetUser() user: User) {
    return this.orderService.completeDrop(id, user.id);
  }

  @Post('drop/:id/reject')
  @ApiOperation({ summary: 'Reject a delivery order' })
  async rejectDrop(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('reason') reason?: string
  ) {
    return this.orderService.rejectDrop(id, user.id, reason);
  }
}
