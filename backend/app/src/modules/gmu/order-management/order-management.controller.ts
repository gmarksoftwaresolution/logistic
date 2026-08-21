import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrderManagementService } from './order-management.service';
import { OrderService as TransporterOrderService } from '../../transporter/order/order.service';
import { OrderService as ShgOrderService } from '../../shg/order/order.service';
import { JwtAuthGuard } from '../../../shared/auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { ShgActionDto, ShgRescheduleDto, TransporterActionDto, TransporterRescheduleDto } from './dto/workflow.dto';
import { OrderFilterDto } from './dto/order-filter.dto';

@ApiTags('GMU Order Management')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderManagementController {
  constructor(
    private readonly service: OrderManagementService,
    private readonly transporterOrderService: TransporterOrderService,
    private readonly shgOrderService: ShgOrderService
  ) {}

  @Get('counts')
  @ApiOperation({ summary: 'Get counts for all order and inventory tabs' })
  async getCounts() {
    return this.service.getCounts();
  }

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get dashboard summary metrics' })
  async getDashboardSummary(@Request() req: any, @Query('filter') filter?: string) {
    if (req.user?.role === 'TRANSPORTER') {
      const transporterId = req.user?.sub || req.user?.id;
      return this.transporterOrderService.getDashboardSummary(transporterId, filter);
    }
    return this.service.getCounts();
  }

  @Get('shg-upcoming')
  @ApiOperation({ summary: 'Get upcoming expected orders for SHG' })
  async getShgUpcomingOrders(@Request() req: any) {
    return this.shgOrderService.getUpcomingOrders(req.user);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming expected orders for transporter or SHG' })
  async getUpcomingOrders(@Request() req: any) {
    if (req.user?.role === 'SHG') {
      return this.shgOrderService.getUpcomingOrders(req.user);
    }
    const transporterId = req.user?.id || req.user?.sub;
    return this.transporterOrderService.getUpcomingOrders(transporterId);
  }

  @Get('upcoming-orders')
  @ApiOperation({ summary: 'Get upcoming expected orders alias' })
  async getUpcomingOrdersAlias(@Request() req: any) {
    return this.getUpcomingOrders(req);
  }

  @Get('new/assigned')
  @ApiOperation({ summary: 'Get all active pickup assignments for the logged-in SHG' })
  async getNewAssignedOrders(@Query() filter: OrderFilterDto, @Request() req: any) {
    if (req.user?.role === 'SHG') {
      const shgId = req.user?.sub || req.user?.id;
      return this.shgOrderService.getAssignedPickups(shgId, req.user?.mobile);
    }
    return this.service.getPickupNewOrders(filter);
  }

  @Get('completed')
  @ApiOperation({ summary: 'Get completed orders' })
  async getCompletedOrders(@Query() filter: OrderFilterDto, @Request() req: any) {
    if (req.user?.role === 'SHG') {
      const shgId = req.user?.sub || req.user?.id;
      return this.shgOrderService.getCompletedOrders(shgId, req.user?.mobile);
    }
    return this.service.getDropCompletedOrders(filter);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get SHG live inventory summary' })
  async getShgInventorySummary(@Request() req: any) {
    const shgId = req.user?.sub || req.user?.id;
    return this.shgOrderService.getInventorySummary(shgId);
  }

  @Get('inventory/in-stock')
  @ApiOperation({ summary: 'Get SHG in-stock inventory orders' })
  async getShgInStockOrders(@Request() req: any) {
    const shgId = req.user?.sub || req.user?.id;
    return this.shgOrderService.getInStockOrders(shgId);
  }

  @Get('inventory/out-stock')
  @ApiOperation({ summary: 'Get SHG out-stock inventory orders' })
  async getShgOutStockOrders(@Request() req: any) {
    const shgId = req.user?.sub || req.user?.id;
    return this.shgOrderService.getOutStockOrders(shgId);
  }

  @Get('rejected')
  @ApiOperation({ summary: 'Get rejected orders' })
  async getRejectedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupRejectedOrders(filter);
  }

  @Get('pickup/new')
  @ApiOperation({ summary: 'Get all new pickup orders (PENDING_PICKUP, PICKUP_SHG_PENDING)' })
  async getPickupNewOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupNewOrders(filter);
  }

  @Get('pickup/assigned')
  @ApiOperation({ summary: 'Get all assigned/in-transit pickup orders' })
  async getPickupAssignedOrders(@Query() filter: OrderFilterDto, @Request() req: any) {
    if (req.user?.role === 'TRANSPORTER') {
      const transporterId = req.user?.sub || req.user?.id;
      return this.transporterOrderService.getAssignedPickups(transporterId);
    }
    if (req.user?.role === 'SHG') {
      const shgId = req.user?.sub || req.user?.id;
      return this.shgOrderService.getAssignedPickups(shgId, req.user?.mobile);
    }
    return this.service.getPickupAssignedOrders(filter);
  }

  @Get('pickup/warehouse')
  @ApiOperation({ summary: 'Get all warehouse orders (HUB_RECEIVED, BARCODE_GENERATED)' })
  async getPickupWarehouseOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupWarehouseOrders(filter);
  }

  @Get('pickup/rejected')
  @ApiOperation({ summary: 'Get all rejected pickup requests' })
  async getPickupRejectedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupRejectedOrders(filter);
  }

  @Get('pickup/rescheduled')
  @ApiOperation({ summary: 'Get all rescheduled pickup orders' })
  async getPickupRescheduledOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupRescheduledOrders(filter);
  }

  @Get('drop/new')
  @ApiOperation({ summary: 'Get all new drop orders (DISPATCHED, DROP_SHG_PENDING)' })
  async getDropNewOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropNewOrders(filter);
  }

  @Get('drop/assigned')
  @ApiOperation({ summary: 'Get all assigned/in-transit drop orders' })
  async getDropAssignedOrders(@Query() filter: OrderFilterDto, @Request() req: any) {
    if (req.user?.role === 'TRANSPORTER') {
      const transporterId = req.user?.sub || req.user?.id;
      return this.transporterOrderService.getAssignedDrops(transporterId);
    }
    if (req.user?.role === 'SHG') {
      const shgId = req.user?.sub || req.user?.id;
      return this.shgOrderService.getAssignedPickups(shgId, req.user?.mobile);
    }
    return this.service.getDropAssignedOrders(filter);
  }

  @Get('drop/completed')
  @ApiOperation({ summary: 'Get all completed/delivered drop orders' })
  async getDropCompletedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropCompletedOrders(filter);
  }

  @Get('drop/rejected')
  @ApiOperation({ summary: 'Get all rejected drop requests' })
  async getDropRejectedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropRejectedOrders(filter);
  }

  @Get('drop/rescheduled')
  @ApiOperation({ summary: 'Get all rescheduled drop orders' })
  async getDropRescheduledOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropRescheduledOrders(filter);
  }

  @Get('returns/assigned')
  @ApiOperation({ summary: 'Get all active return assignments for SHG' })
  async getAssignedReturns(@Request() req: any) {
    if (req.user?.role === 'SHG') {
      const shgId = req.user?.sub || req.user?.id;
      return this.shgOrderService.getAssignedReturns(shgId);
    }
    return [];
  }

  @Get('returns/transporter')
  @ApiOperation({ summary: 'Get all transporter return orders' })
  async getTransporterReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getTransporterReturnOrders(filter);
  }

  @Get('returns/buyer')
  @ApiOperation({ summary: 'Get all buyer return orders' })
  async getBuyerReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getBuyerReturnOrders(filter);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get complete order history metrics and list' })
  async getOrderHistory(@Query() filter: OrderFilterDto) {
    return this.service.getOrderHistory(filter);
  }

  @Get('inventory/stored')
  @ApiOperation({ summary: 'Get stored orders in inventory' })
  async getInventoryStoredOrders(@Query() filter: OrderFilterDto) {
    return this.service.getInventoryStoredOrders(filter);
  }

  @Get('inventory/transporter-return')
  @ApiOperation({ summary: 'Get stored transporter return orders' })
  async getInventoryTransporterReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getInventoryTransporterReturnOrders(filter);
  }

  @Get('inventory/buyer-return')
  @ApiOperation({ summary: 'Get stored buyer return orders' })
  async getInventoryBuyerReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getInventoryBuyerReturnOrders(filter);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new order in GMU' })
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.service.createOrder(dto);
  }

  @Post('drop')
  @ApiOperation({ summary: 'Create a new drop order manually in GMU' })
  async createDropOrder(@Body() dto: CreateOrderDto) {
    return this.service.createDropOrder(dto);
  }

  @Post(':id/broadcast-shg')
  @ApiOperation({ summary: 'Broadcast pickup request to matching SHGs' })
  async broadcastShg(@Param('id') id: string) {
    return this.service.broadcastShg(id);
  }

  @Post(':id/shg-accept')
  @ApiOperation({ summary: 'Accept pickup request by an SHG' })
  async shgAccept(@Param('id') id: string, @Body() dto: ShgActionDto) {
    return this.service.shgAccept(id, dto.shgId);
  }

  @Post(':id/shg-reject')
  @ApiOperation({ summary: 'Reject pickup request by an SHG' })
  async shgReject(@Param('id') id: string, @Body() dto: ShgActionDto) {
    return this.service.shgReject(id, dto.shgId);
  }

  @Post(':id/shg-reschedule')
  @ApiOperation({ summary: 'Reschedule pickup request by an SHG' })
  async shgReschedule(@Param('id') id: string, @Body() dto: ShgRescheduleDto) {
    return this.service.shgReschedule(id, dto.shgId, dto.duration);
  }

  @Post(':id/shg-picked')
  @ApiOperation({ summary: 'Mark that SHG has successfully picked up the order' })
  async shgPicked(@Param('id') id: string) {
    return this.service.shgPicked(id);
  }

  @Post(':id/broadcast-transporter')
  @ApiOperation({ summary: 'Broadcast pickup request to matching transporters' })
  async broadcastTransporter(@Param('id') id: string) {
    return this.service.broadcastTransporter(id);
  }

  @Post(':id/transporter-accept')
  @ApiOperation({ summary: 'Accept pickup request by a transporter' })
  async transporterAccept(@Param('id') id: string, @Body() dto: TransporterActionDto) {
    return this.service.transporterAccept(id, dto.transporterId);
  }

  @Post(':id/transporter-reject')
  @ApiOperation({ summary: 'Reject pickup request by a transporter' })
  async transporterReject(@Param('id') id: string, @Body() dto: TransporterActionDto) {
    return this.service.transporterReject(id, dto.transporterId);
  }

  @Post(':id/transporter-reschedule')
  @ApiOperation({ summary: 'Reschedule pickup request by a transporter' })
  async transporterReschedule(@Param('id') id: string, @Body() dto: TransporterRescheduleDto) {
    return this.service.transporterReschedule(id, dto.transporterId);
  }

  @Post(':id/transporter-picked')
  @ApiOperation({ summary: 'Mark that transporter has successfully picked up the order' })
  async transporterPicked(@Param('id') id: string) {
    return this.service.transporterPicked(id);
  }

  @Post(':id/warehouse-intake')
  @ApiOperation({ summary: 'Perform warehouse intake for received orders' })
  async warehouseIntake(@Param('id') id: string) {
    return this.service.warehouseIntake(id);
  }

  @Post(':id/store')
  @ApiOperation({ summary: 'Store order in warehouse inventory' })
  async storeInventory(@Param('id') id: string) {
    return this.service.storeInventory(id);
  }

  @Post(':id/drop-shg-broadcast')
  @ApiOperation({ summary: 'Broadcast drop request to matching approved SHGs' })
  async broadcastDropShg(@Param('id') id: string) {
    return this.service.broadcastDropShg(id);
  }

  @Post(':id/drop-shg-accept')
  @ApiOperation({ summary: 'Accept drop delivery request by an SHG' })
  async dropShgAccept(@Param('id') id: string, @Body() dto: ShgActionDto) {
    return this.service.dropShgAccept(id, dto.shgId);
  }

  @Post(':id/drop-shg-reject')
  @ApiOperation({ summary: 'Reject drop delivery request by an SHG' })
  async dropShgReject(@Param('id') id: string, @Body() dto: ShgActionDto) {
    return this.service.dropShgReject(id, dto.shgId);
  }

  @Post(':id/drop-shg-reschedule')
  @ApiOperation({ summary: 'Reschedule drop delivery request by an SHG' })
  async dropShgReschedule(@Param('id') id: string, @Body() dto: ShgRescheduleDto) {
    return this.service.dropShgReschedule(id, dto.shgId, dto.duration);
  }

  @Post(':id/drop-transporter-broadcast')
  @ApiOperation({ summary: 'Broadcast drop delivery request to matching transporters' })
  async broadcastDropTransporter(@Param('id') id: string) {
    return this.service.broadcastDropTransporter(id);
  }

  @Post(':id/drop-transporter-accept')
  @ApiOperation({ summary: 'Accept drop delivery request by a transporter' })
  async dropTransporterAccept(@Param('id') id: string, @Body() dto: TransporterActionDto) {
    return this.service.dropTransporterAccept(id, dto.transporterId);
  }

  @Post(':id/drop-transporter-picked')
  @ApiOperation({ summary: 'Mark that transporter has picked up the drop parcel from GMU' })
  async dropTransporterPicked(@Param('id') id: string) {
    return this.service.dropTransporterPicked(id);
  }

  @Post(':id/drop-transporter-reject')
  @ApiOperation({ summary: 'Reject drop delivery request by a transporter' })
  async dropTransporterReject(@Param('id') id: string, @Body() dto: TransporterActionDto) {
    return this.service.dropTransporterReject(id, dto.transporterId);
  }

  @Post(':id/drop-transporter-reschedule')
  @ApiOperation({ summary: 'Reschedule drop delivery request by a transporter' })
  async dropTransporterReschedule(@Param('id') id: string, @Body() dto: TransporterRescheduleDto) {
    return this.service.dropTransporterReschedule(id, dto.transporterId);
  }

  @Post(':id/drop-transporter-drops-to-shg')
  @ApiOperation({ summary: 'Mark that transporter has dropped off the parcel to drop SHG' })
  async dropTransporterDropsToShg(@Param('id') id: string) {
    return this.service.dropTransporterDropsToShg(id);
  }

  @Post(':id/drop-complete')
  @ApiOperation({ summary: 'Mark drop delivery as complete (delivered to buyer by SHG)' })
  async dropComplete(@Param('id') id: string) {
    return this.service.dropComplete(id);
  }

  @Post(':id/transporter-return')
  @ApiOperation({ summary: 'Mark order for Transporter Return flow' })
  async createTransporterReturn(@Param('id') id: string) {
    return this.service.createTransporterReturn(id);
  }

  @Post(':id/transporter-return-intake')
  @ApiOperation({ summary: 'GMU Intake for returned transporter parcel' })
  async transporterReturnIntake(@Param('id') id: string) {
    return this.service.transporterReturnIntake(id);
  }

  @Post(':id/buyer-return/request')
  @ApiOperation({ summary: 'Initiate Buyer Return request flow (assigns original drop SHG)' })
  async requestBuyerReturn(@Param('id') id: string) {
    return this.service.requestBuyerReturn(id);
  }

  @Post(':id/buyer-return/shg-accept')
  @ApiOperation({ summary: 'Accept buyer return request by a SHG' })
  async buyerReturnShgAccept(@Param('id') id: string) {
    return this.service.buyerReturnShgAccept(id);
  }

  @Post(':id/buyer-return/shg-picked')
  @ApiOperation({ summary: 'Mark that return parcel is picked by SHG and is at SHG' })
  async buyerReturnShgPicked(@Param('id') id: string) {
    return this.service.buyerReturnShgPicked(id);
  }

  @Post(':id/buyer-return/broadcast-transporter')
  @ApiOperation({ summary: 'Broadcast buyer return request to matching transporters' })
  async broadcastBuyerReturnTransporter(@Param('id') id: string) {
    return this.service.broadcastBuyerReturnTransporter(id);
  }

  @Post(':id/buyer-return/transporter-accept')
  @ApiOperation({ summary: 'Accept buyer return request by a transporter' })
  async buyerReturnTransporterAccept(@Param('id') id: string, @Body() dto: TransporterActionDto) {
    return this.service.buyerReturnTransporterAccept(id, dto.transporterId);
  }

  @Post(':id/buyer-return/transporter-picked')
  @ApiOperation({ summary: 'Mark that return parcel is picked by transporter and in-transit to GMU' })
  async buyerReturnTransporterPicked(@Param('id') id: string) {
    return this.service.buyerReturnTransporterPicked(id);
  }

  @Post(':id/buyer-return/transporter-delivered')
  @ApiOperation({ summary: 'Mark that return parcel is delivered by transporter to GMU Hub (sets status to RETURN_COMPLETED)' })
  async buyerReturnTransporterDelivered(@Param('id') id: string) {
    return this.service.buyerReturnTransporterDelivered(id);
  }

  @Post(':id/buyer-return/intake')
  @ApiOperation({ summary: 'GMU Intake for buyer return parcel (sets status to RETURN_COMPLETED)' })
  async buyerReturnIntakeNew(@Param('id') id: string) {
    return this.service.buyerReturnIntake(id);
  }

  @Post(':id/buyer-return-scan')
  @ApiOperation({ summary: 'Perform buyer return scan and intake' })
  async buyerReturnScan(@Param('id') id: string, @Body('barcode') barcode: string) {
    const order = await this.service.getOrderDetails(id);
    if (order.barcode && order.barcode !== barcode) {
      throw new BadRequestException(`Barcode scan verification failed. Expected ${order.barcode}, received ${barcode || 'none'}.`);
    }
    return this.service.buyerReturnIntake(id);
  }

  @Post(':id/transporter-return-scan')
  @ApiOperation({ summary: 'Perform transporter return scan and intake' })
  async transporterReturnScan(@Param('id') id: string, @Body('barcode') barcode: string) {
    const order = await this.service.getOrderDetails(id);
    if (order.barcode && order.barcode !== barcode) {
      throw new BadRequestException(`Barcode scan verification failed. Expected ${order.barcode}, received ${barcode || 'none'}.`);
    }
    return this.service.transporterReturnIntake(id);
  }

  @Post(':id/redispatch')
  @ApiOperation({ summary: 'Re-dispatch transporter returned order to Drop flow' })
  async redispatchOrder(@Param('id') id: string) {
    return this.service.redispatchOrder(id);
  }

  @Post(':id/simulate-reschedule-timeout')
  @ApiOperation({ summary: 'Simulation endpoint to trigger immediate auto-broadcast timeout for rescheduled orders' })
  async simulateRescheduleTimeout(@Param('id') id: string) {
    return this.service.simulateRescheduleTimeout(id);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark order as COMPLETED' })
  async completeOrder(@Param('id') id: string) {
    return this.service.completeOrder(id);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Put order ON_HOLD' })
  async holdOrder(@Param('id') id: string) {
    return this.service.holdOrder(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(@Param('id') id: string) {
    return this.service.cancelOrder(id);
  }

  @Post(':id/sla-breach')
  @ApiOperation({ summary: 'Mark order as SLA_BREACHED' })
  async slaBreachOrder(@Param('id') id: string) {
    return this.service.slaBreachOrder(id);
  }

  // PARAMETERIZED ROUTE MUST BE AT THE VERY END OF THE CONTROLLER
  @Get(':id')
  @ApiOperation({ summary: 'Get complete order information by UUID or OrderID' })
  async getOrderDetails(@Param('id') id: string) {
    if (id === 'history') {
      return this.service.getOrderHistory();
    }
    return this.service.getOrderDetails(id);
  }
}
