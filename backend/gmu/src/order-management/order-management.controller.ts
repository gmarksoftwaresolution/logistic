import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery } from '@nestjs/swagger';
import { OrderManagementService } from './order-management.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { ShgActionDto, ShgRescheduleDto, TransporterActionDto, TransporterRescheduleDto } from './dto/workflow.dto';
import { OrderFilterDto } from './dto/order-filter.dto';

@ApiTags('Order Management')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderManagementController {
  // Trigger watch reload
  constructor(private readonly service: OrderManagementService) {}

  @Get('counts')
  @ApiOperation({ summary: 'Get counts for all order and inventory tabs' })
  async getCounts() {
    return this.service.getCounts();
  }

  // --- QUERY ENDPOINTS ---

  @Get('pickup/new')
  @ApiOperation({ summary: 'Get all new pickup orders (PENDING_PICKUP, PICKUP_SHG_PENDING)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (PENDING, PENDING_ACCEPTANCE)', example: 'PENDING' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getPickupNewOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupNewOrders(filter);
  }

  @Get('pickup/assigned')
  @ApiOperation({ summary: 'Get all assigned/in-transit pickup orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'TRANSPORTER_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getPickupAssignedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupAssignedOrders(filter);
  }

  @Get('pickup/warehouse')
  @ApiOperation({ summary: 'Get all warehouse orders (HUB_RECEIVED, BARCODE_GENERATED)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'BARCODE_GENERATED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getPickupWarehouseOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupWarehouseOrders(filter);
  }

  @Get('pickup/rejected')
  @ApiOperation({ summary: 'Get all rejected pickup requests' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'TRANSPORTER_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getPickupRejectedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupRejectedOrders(filter);
  }

  @Get('pickup/rescheduled')
  @ApiOperation({ summary: 'Get all rescheduled pickup orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'TRANSPORTER_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getPickupRescheduledOrders(@Query() filter: OrderFilterDto) {
    return this.service.getPickupRescheduledOrders(filter);
  }

  @Get('drop/new')
  @ApiOperation({ summary: 'Get all new drop orders (DISPATCHED, DROP_SHG_PENDING)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'PENDING' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getDropNewOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropNewOrders(filter);
  }

  @Get('drop/assigned')
  @ApiOperation({ summary: 'Get all assigned/in-transit drop orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'DROP_SHG_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getDropAssignedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropAssignedOrders(filter);
  }

  @Get('drop/completed')
  @ApiOperation({ summary: 'Get all completed/delivered drop orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'DELIVERED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getDropCompletedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropCompletedOrders(filter);
  }

  @Get('drop/rejected')
  @ApiOperation({ summary: 'Get all rejected drop requests' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'DROP_SHG_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getDropRejectedOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropRejectedOrders(filter);
  }

  @Get('drop/rescheduled')
  @ApiOperation({ summary: 'Get all rescheduled drop orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'DROP_SHG_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getDropRescheduledOrders(@Query() filter: OrderFilterDto) {
    return this.service.getDropRescheduledOrders(filter);
  }

  @Get('returns/transporter')
  @ApiOperation({ summary: 'Get all transporter return orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'TRANSPORTER_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getTransporterReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getTransporterReturnOrders(filter);
  }

  @Get('returns/buyer')
  @ApiOperation({ summary: 'Get all buyer return orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'TRANSPORTER_ACCEPTED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getBuyerReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getBuyerReturnOrders(filter);
  }

  @Get('inventory/stored')
  @ApiOperation({ summary: 'Get stored orders in inventory' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (Stored, Dispatch)', example: 'Stored' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getInventoryStoredOrders(@Query() filter: OrderFilterDto) {
    return this.service.getInventoryStoredOrders(filter);
  }

  @Get('inventory/transporter-return')
  @ApiOperation({ summary: 'Get stored transporter return orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status (Stored, Dispatch)', example: 'Stored' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getInventoryTransporterReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getInventoryTransporterReturnOrders(filter);
  }

  @Get('inventory/buyer-return')
  @ApiOperation({ summary: 'Get stored buyer return orders' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status', example: 'RETURN_COMPLETED' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by creation date (YYYY-MM-DD)', example: '2026-06-22' })
  async getInventoryBuyerReturnOrders(@Query() filter: OrderFilterDto) {
    return this.service.getInventoryBuyerReturnOrders(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get complete order information by UUID or OrderID' })
  async getOrderDetails(@Param('id') id: string) {
    return this.service.getOrderDetails(id);
  }

  // --- TRANSITIONS ---

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



  // --- NEW BUYER RETURN FLOW ENDPOINTS ---

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

  // ——— Exception Lifecycle Endpoints ————————————————————————————————————

  @Post(':id/complete')
  @ApiOperation({ summary: 'Mark order as COMPLETED (Phase 8 — buyer confirms delivery)' })
  async completeOrder(@Param('id') id: string) {
    return this.service.completeOrder(id);
  }

  @Post(':id/hold')
  @ApiOperation({ summary: 'Put order ON_HOLD (exception flow — GMU coordinator action)' })
  async holdOrder(@Param('id') id: string) {
    return this.service.holdOrder(id);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel order (exception flow — seller or GMU cancellation)' })
  async cancelOrder(@Param('id') id: string) {
    return this.service.cancelOrder(id);
  }

  @Post(':id/sla-breach')
  @ApiOperation({ summary: 'Mark order as SLA_BREACHED (exception flow — system triggered)' })
  async slaBreachOrder(@Param('id') id: string) {
    return this.service.slaBreachOrder(id);
  }
}
