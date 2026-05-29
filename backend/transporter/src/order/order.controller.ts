import { Controller, Get, Post, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';

@ApiTags('Transporter Order Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('pickup/assigned')
  @ApiOperation({ summary: 'Get all active pickup assignments for the logged-in transporter' })
  async getAssignedPickups(@Request() req: any) {
    return this.orderService.getAssignedPickups(req.user.id);
  }

  @Post('pickup/:id/accept')
  @ApiOperation({ summary: 'Accept a pickup order' })
  async acceptPickup(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.orderService.acceptPickup(id, req.user.id);
  }

  @Post('pickup/:id/complete')
  @ApiOperation({ summary: 'Mark a pickup order as complete' })
  async completePickup(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.orderService.completePickup(id, req.user.id);
  }

  @Get('drop/assigned')
  @ApiOperation({ summary: 'Get all active drop-off delivery assignments for the transporter' })
  async getAssignedDrops(@Request() req: any) {
    return this.orderService.getAssignedDrops(req.user.id);
  }

  @Post('drop/:id/accept')
  @ApiOperation({ summary: 'Accept a delivery order' })
  async acceptDrop(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.orderService.acceptDrop(id, req.user.id);
  }

  @Post('drop/:id/complete')
  @ApiOperation({ summary: 'Mark a delivery order as complete' })
  async completeDrop(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.orderService.completeDrop(id, req.user.id);
  }
}
