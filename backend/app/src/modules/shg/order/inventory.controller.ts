import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/user.decorator';
import { User, UserRole } from '@prisma/client';
import { OrderService } from './order.service';

@ApiTags('SHG Inventory Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHG)
@Controller('shg/inventory')
export class InventoryController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: 'Get live inventory summary (counts, storage weight, breakdown)' })
  async getSummary(@GetUser() user: User) {
    return this.orderService.getInventorySummary(user.id);
  }

  @Get('in-stock')
  @ApiOperation({ summary: 'Get all in-stock orders currently held at the SHG home center' })
  async getInStock(@GetUser() user: User) {
    return this.orderService.getInStockOrders(user.id);
  }

  @Get('out-stock')
  @ApiOperation({ summary: 'Get all out-stock orders dispatched or delivered' })
  async getOutStock(@GetUser() user: User) {
    return this.orderService.getOutStockOrders(user.id);
  }
}
