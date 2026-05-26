import { Controller, Get, Post, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';

@ApiTags('Transporter Order Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('assigned')
  @ApiOperation({ summary: 'Get all active orders assigned to the logged-in transporter' })
  async getAssignedOrders(@Request() req: any) {
    return this.orderService.getAssignedOrders(req.user.id);
  }

  @Post(':orderId/update-holder')
  @ApiOperation({ summary: 'Update the physical custody / current holder of an order' })
  @ApiResponse({ status: 200, description: 'Custody status updated successfully.' })
  async updateHolderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body('currentHolder') currentHolder: string,
  ) {
    return this.orderService.updateHolderStatus(orderId, currentHolder);
  }

  @Post(':orderId/complete')
  @ApiOperation({ summary: 'Mark an order as fully completed and delivered to the buyer' })
  @ApiResponse({ status: 200, description: 'Order completed successfully.' })
  async completeOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.orderService.completeOrder(orderId);
  }
}
