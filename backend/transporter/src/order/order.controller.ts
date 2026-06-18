import { Controller, Get, Post, Param, UseGuards, Request, ParseIntPipe, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrderService } from './order.service';

@ApiTags('Transporter Order Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
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
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Verification code (e.g. 1234)',
          example: '1234',
        },
      },
      required: ['code'],
    },
  })
  async completePickup(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body('code') code?: string,
  ) {
    return this.orderService.completePickup(id, req.user.id, code);
  }

  @Post('pickup/:id/reject')
  @ApiOperation({ summary: 'Reject a pickup order' })
  async rejectPickup(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body('remarks') remarks?: string,
  ) {
    return this.orderService.rejectPickup(id, req.user.id, remarks);
  }

  @Get('drop/assigned')
  @ApiOperation({ summary: 'Get all active drop-off delivery assignments for the transporter' })
  async getAssignedDrops(@Request() req: any) {
    return this.orderService.getAssignedDrops(req.user.id);
  }
  @Post('drop/:id/accept')
  @ApiOperation({ summary: 'Accept a drop order' })
  async acceptDrop(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.orderService.acceptDrop(id, req.user.id);
  }
  @Post('drop/:id/complete')
  @ApiOperation({ summary: 'Mark a delivery order as complete' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          description: 'Verification code (e.g. 5678)',
          example: '5678',
        },
      },
    },
  })
  async completeDrop(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body('code') code?: string,
  ) {
    return this.orderService.completeDrop(id, req.user.id, code);
  }

  @Post('drop/:id/reject')
  @ApiOperation({ summary: 'Reject a drop order' })
  async rejectDrop(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body('remarks') remarks?: string,
  ) {
    return this.orderService.rejectDrop(id, req.user.id, remarks);
  }
}

