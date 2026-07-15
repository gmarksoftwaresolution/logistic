import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrderHistoryService } from '../service/order-history.service';
import { HistoryQueryDto, OrderHistoryStatus } from '../dto/history-query.dto';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { GetUser } from '../../../common/decorators/user.decorator';
import { User, UserRole } from '@prisma/client';

@ApiTags('Order History')
@ApiBearerAuth()
@Controller('order-history')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHG)
export class OrderHistoryController {
  constructor(private readonly orderHistoryService: OrderHistoryService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated order history for the logged-in SHG' })
  async getHistory(@GetUser() user: User, @Query() query: HistoryQueryDto) {
    return this.orderHistoryService.getHistory(user.id, user.phoneNumber, query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get order history statistics' })
  async getStats(@GetUser() user: User) {
    return this.orderHistoryService.getStats(user.id);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search order history' })
  async searchHistory(@GetUser() user: User, @Query('query') query: string) {
    const dto = new HistoryQueryDto();
    dto.query = query;
    return this.orderHistoryService.getHistory(user.id, user.phoneNumber, dto);
  }

  @Get('filter')
  @ApiOperation({ summary: 'Filter order history by status or date range' })
  async filterHistory(
    @GetUser() user: User,
    @Query('status') status?: OrderHistoryStatus,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    const dto = new HistoryQueryDto();
    dto.status = status;
    dto.fromDate = fromDate;
    dto.toDate = toDate;
    return this.orderHistoryService.getHistory(user.id, user.phoneNumber, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details for a specific historical order by ID' })
  async getOrderById(@GetUser() user: User, @Param('id') id: string) {
    return this.orderHistoryService.getOrderById(id, user.id);
  }
}
