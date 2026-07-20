import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QrService } from './qr.service';
import { GenerateQrDto } from './dto/generate-qr.dto';
import { VerifyQrDto } from './dto/verify-qr.dto';

@ApiTags('QR Operations')
@Controller('qr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrController {
  // Trigger watch reload 2
  constructor(private readonly qrService: QrService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate QR codes for parcels in an order' })
  async generateQr(@Body() dto: GenerateQrDto, @Request() req: any) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    return this.qrService.generateQr(dto.orderId, dto.regenerate, userId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Retrieve all parcels for an order' })
  async getOrderParcels(@Param('orderId') orderId: string) {
    return this.qrService.getOrderParcels(orderId);
  }

  @Get(':parcelId')
  @ApiOperation({ summary: 'Retrieve QR details for a parcel' })
  async getParcel(@Param('parcelId') parcelId: string) {
    return this.qrService.getParcel(parcelId);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify scanned QR code and update state' })
  async verifyQr(@Body() dto: VerifyQrDto, @Request() req: any) {
    const userId = dto.userId || (req.user?.id ? String(req.user.id) : 'SYSTEM');
    const userRole = dto.userRole || (req.user?.role ? String(req.user.role) : 'SYSTEM');
    return this.qrService.verifyQr(
      dto.parcelId,
      dto.verificationToken,
      userId,
      userRole,
      dto.latitude,
      dto.longitude,
      dto.remarks,
      dto.legType
    );
  }

  // PICKUP SESSIONS
  @Post('pickup/session/start')
  @ApiOperation({ summary: 'Start a transient pickup scanning session' })
  async startPickupSession(@Body() body: { orderIds: string[] }, @Request() req: any) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
    return this.qrService.startSession('PICKUP', userId, userRole, body.orderIds);
  }

  @Post('pickup/scan')
  @ApiOperation({ summary: 'Scan a parcel in a pickup session' })
  async scanPickup(@Body() body: { sessionId: string; qrData: string }, @Request() req: any) {
    return this.qrService.scanParcel('PICKUP', body.sessionId, body.qrData, req.user);
  }

  @Post('pickup/remove')
  @ApiOperation({ summary: 'Remove a parcel from a pickup session' })
  async removePickup(@Body() body: { sessionId: string; parcelId: string }) {
    return this.qrService.removeParcelFromSession(body.sessionId, body.parcelId);
  }

  @Post('pickup/confirm')
  @ApiOperation({ summary: 'Confirm all scanned parcels in a pickup session' })
  async confirmPickup(@Body() body: { sessionId: string }) {
    return this.qrService.confirmSession('PICKUP', body.sessionId);
  }

  @Post('pickup/confirm-order')
  @ApiOperation({ summary: 'Confirm a single order within a pickup session' })
  async confirmPickupOrder(@Body() body: { sessionId: string; orderId: string }, @Request() req: any) {
    return this.qrService.confirmSessionOrder('PICKUP', body.sessionId, body.orderId, req.user);
  }

  @Get('pickup/session')
  @ApiOperation({ summary: 'Retrieve active pickup session status' })
  async getPickupSession(@Request() req: any, @Body('sessionId') sessionId?: string) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
    return this.qrService.getSessionDetails('PICKUP', userId, userRole, sessionId);
  }

  // DROP SESSIONS
  @Post('drop/session/start')
  @ApiOperation({ summary: 'Start a transient drop scanning session' })
  async startDropSession(@Body() body: { orderIds: string[] }, @Request() req: any) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
    return this.qrService.startSession('DROP', userId, userRole, body.orderIds);
  }

  @Post('drop/scan')
  @ApiOperation({ summary: 'Scan a parcel in a drop session' })
  async scanDrop(@Body() body: { sessionId: string; qrData: string }, @Request() req: any) {
    return this.qrService.scanParcel('DROP', body.sessionId, body.qrData, req.user);
  }

  @Post('drop/remove')
  @ApiOperation({ summary: 'Remove a parcel from a drop session' })
  async removeDrop(@Body() body: { sessionId: string; parcelId: string }) {
    return this.qrService.removeParcelFromSession(body.sessionId, body.parcelId);
  }

  @Post('drop/confirm')
  @ApiOperation({ summary: 'Confirm all scanned parcels in a drop session' })
  async confirmDrop(@Body() body: { sessionId: string }) {
    return this.qrService.confirmSession('DROP', body.sessionId);
  }

  @Post('drop/confirm-order')
  @ApiOperation({ summary: 'Confirm a single order within a drop session' })
  async confirmDropOrder(@Body() body: { sessionId: string; orderId: string }, @Request() req: any) {
    return this.qrService.confirmSessionOrder('DROP', body.sessionId, body.orderId, req.user);
  }

  @Get('drop/session')
  @ApiOperation({ summary: 'Retrieve active drop session status' })
  async getDropSession(@Request() req: any, @Body('sessionId') sessionId?: string) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
    return this.qrService.getSessionDetails('DROP', userId, userRole, sessionId);
  }
}
