import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/user.decorator';
import { User, UserRole } from '@prisma/client';
import { OrderService } from './order.service';
import { AcceptOrdersDto, RejectOrdersDto, RescheduleOrdersDto } from './dto/order.dto';

@ApiTags('SHG Order Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHG)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('incoming')
  @ApiOperation({ summary: 'Get all incoming orders assigned to this SHG (auto-seeds mock data if none exist)' })
  async getIncomingOrders(@GetUser() user: User) {
    return this.orderService.getIncomingOrders(user.id);
  }

  @Post('accept')
  @ApiOperation({ summary: 'Accept single or batch of incoming orders' })
  @ApiResponse({ status: 200, description: 'Orders accepted successfully.' })
  async acceptOrders(@GetUser() user: User, @Body() dto: AcceptOrdersDto) {
    return this.orderService.acceptOrders(user.id, dto.orderIds);
  }

  @Post('accept-all')
  @ApiOperation({ summary: 'Accept all incoming orders assigned to this SHG' })
  @ApiResponse({ status: 200, description: 'All orders accepted successfully.' })
  async acceptAllOrders(@GetUser() user: User) {
    return this.orderService.acceptAllOrders(user.id);
  }

  @Post('reject')
  @ApiOperation({ summary: 'Reject single or batch of incoming orders with a reason' })
  @ApiResponse({ status: 200, description: 'Orders rejected successfully.' })
  async rejectOrders(@GetUser() user: User, @Body() dto: RejectOrdersDto) {
    return this.orderService.rejectOrders(user.id, dto.orderIds, dto.reason);
  }

  @Post('reschedule')
  @ApiOperation({ summary: 'Reschedule single or batch of incoming orders with new date/time' })
  @ApiResponse({ status: 200, description: 'Orders rescheduled successfully.' })
  async rescheduleOrders(@GetUser() user: User, @Body() dto: RescheduleOrdersDto) {
    return this.orderService.rescheduleOrders(user.id, dto.orderIds, dto.date, dto.time, dto.reason);
  }

  @Get('accepted')
  @ApiOperation({ summary: 'Get all accepted orders for this SHG' })
  async getAcceptedOrders(@GetUser() user: User) {
    return this.orderService.getAcceptedOrders(user.id);
  }

  @Get('rejected')
  @ApiOperation({ summary: 'Get all rejected orders for this SHG' })
  async getRejectedOrders(@GetUser() user: User) {
    return this.orderService.getRejectedOrders(user.id);
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get all completed orders for this SHG' })
  async getCompletedOrders(@GetUser() user: User) {
    return this.orderService.getCompletedOrders(user.id);
  }
}
