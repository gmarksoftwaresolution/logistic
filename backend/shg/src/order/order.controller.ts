import { Controller, Get, Post, UseGuards, Param, ParseIntPipe, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/user.decorator';
import { User, UserRole } from '@prisma/client';
import { OrderService } from './order.service';
import { RescheduleOrderDto } from './dto/order.dto';

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

  @Get('new/assigned')
  @ApiOperation({ summary: 'Get all active pickup assignments for the logged-in SHG' })
  async getAssignedPickups(@GetUser() user: User) {
    return this.orderService.getAssignedPickups(user.id, user.phoneNumber);
  }

  @Post('new/:id/accept')
  @ApiOperation({ summary: 'Accept a pickup order (supports legType: drop to accept transporter deliveries)' })
  async acceptPickup(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('legType') legType?: 'pickup' | 'drop',
  ) {
    if (legType === 'drop') {
      return this.orderService.acceptDrop(id, user.id);
    }
    return this.orderService.acceptPickup(id, user.id);
  }

  @Post('new/:id/reject')
  @ApiOperation({ summary: 'Reject a pickup order' })
  async rejectPickup(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('reason') reason?: string
  ) {
    return this.orderService.rejectPickup(id, user.id, reason);
  }

  @Post('new/pickup/:id/reject')
  @ApiOperation({ summary: 'Reject an accepted pickup order from the pickup tab' })
  async rejectAcceptedPickup(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('reason') reason?: string
  ) {
    return this.orderService.rejectAcceptedPickup(id, user.id, reason);
  }


  @Get('returns/assigned')
  @ApiOperation({ summary: 'Get all active return assignments (pickup/delivery) for the SHG' })
  async getAssignedReturns(@GetUser() user: User) {
    return this.orderService.getAssignedReturns(user.id);
  }

  @Post('returns/:id/accept')
  @ApiOperation({ summary: 'Accept a return order (pickup or drop)' })
  async acceptReturn(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
  ) {
    return this.orderService.acceptDrop(id, user.id);
  }

  @Post('returns/:id/reject')
  @ApiOperation({ summary: 'Reject a return order' })
  async rejectReturn(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('reason') reason?: string,
  ) {
    return this.orderService.rejectDrop(id, user.id, reason);
  }

  @Post('returns/pickup/:id/reject')
  @ApiOperation({ summary: 'Reject a return pickup order' })
  async rejectReturnPickup(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('reason') reason?: string,
  ) {
    return this.orderService.rejectReturnPickup(id, user.id, reason);
  }

  @Post('returns/pickup/:id/complete')
  @ApiOperation({ summary: 'Mark a return pickup as received from transporter' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '1234' }
      }
    }
  })
  async pickupReturn(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('code') code?: string,
  ) {
    return this.orderService.pickupDrop(id, user.id, code);
  }

  @Post('returns/dilivery/:id/complete')
  @ApiOperation({ summary: 'Mark a return drop as complete (delivered to seller)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '1234' }
      }
    }
  })
  async completeReturn(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('code') code?: string,
  ) {
    return this.orderService.completeDrop(id, user.id, code);
  }


  @Post('new/pickup/:id/complete')
  @ApiOperation({ summary: 'Mark a pickup order as complete (supports legType: drop to receive transporter deliveries)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '1234' },
        legType: { type: 'string', enum: ['pickup', 'drop'], example: 'pickup' }
      }
    }
  })
  async completePickup(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('code') code?: string,
    @Body('legType') legType?: 'pickup' | 'drop',
    @Body() fullBody?: any,
  ) {
    console.log(`[completePickup] id=${id}, legType=${legType}, code=${code}, fullBody=`, fullBody);
    if (legType === 'drop') {
      return this.orderService.pickupDrop(id, user.id, code);
    }
    return this.orderService.completePickup(id, user.id, code);
  }

  @Post('new/dilivery/:id/complete')
  @ApiOperation({ summary: 'Mark a delivery order as complete' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: '1234' }
      }
    }
  })
  async completeDrop(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: User,
    @Body('code') code?: string,
  ) {
    return this.orderService.completeDrop(id, user.id, code);
  }


  @Post('reschedule')
  @ApiOperation({ summary: 'Reschedule an accepted/pending pickup/drop order' })
  async reschedule(@Body() dto: RescheduleOrderDto) {
    return this.orderService.rescheduleAccepted(dto);
  }

  @Post('reschedule/delivery')
  @ApiOperation({ summary: 'Reschedule a delivery (picked up) order' })
  async rescheduleDelivery(@Body() dto: RescheduleOrderDto) {
    return this.orderService.rescheduleDelivery(dto);
  }


}
