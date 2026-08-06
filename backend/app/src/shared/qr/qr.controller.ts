import { Controller, Post, Get, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { QrService } from './qr.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('QR & Scanning')
@Controller('qr')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate QR code for an order parcel' })
  async generateQr(@Body() body: { orderId: string; regenerate?: boolean; createdBy?: string }, @Request() req: any) {
    const userId = body.createdBy || (req.user?.id ? String(req.user.id) : 'SYSTEM');
    return this.qrService.generateQr(body.orderId, body.regenerate, userId);
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
  @ApiOperation({ summary: 'Verify QR code token during scanning transition' })
  async verifyQr(@Body() body: {
    parcelId: string;
    verificationToken?: string;
    scannedByUserId?: string;
    scannedByUserRole?: string;
    latitude?: number;
    longitude?: number;
    remarks?: string;
    legType?: string;
  }, @Request() req: any) {
    const userId = body.scannedByUserId || (req.user?.id ? String(req.user.id) : 'SYSTEM');
    const userRole = body.scannedByUserRole || (req.user?.role ? String(req.user.role) : 'SYSTEM');
    return this.qrService.verifyQr(
      body.parcelId,
      body.verificationToken,
      userId,
      userRole,
      body.latitude,
      body.longitude,
      body.remarks,
      body.legType
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
  async confirmPickup(@Body() body: { sessionId: string; orderId?: string }, @Request() req: any) {
    if (body.orderId) {
      const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
      const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
      return this.qrService.confirmSessionOrder('PICKUP', userId, userRole, body.sessionId, body.orderId);
    }
    return this.qrService.confirmSession('PICKUP', body.sessionId);
  }

  @Post('pickup/confirm-order')
  @ApiOperation({ summary: 'Confirm scanned parcels for a specific order in a pickup session' })
  async confirmPickupOrder(@Body() body: { sessionId: string; orderId: string }, @Request() req: any) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
    return this.qrService.confirmSessionOrder('PICKUP', userId, userRole, body.sessionId, body.orderId);
  }

  @Get('pickup/session')
  @ApiOperation({ summary: 'Retrieve active pickup session status' })
  async getPickupSession(@Request() req: any, @Query('sessionId') sessionId?: string) {
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
  async confirmDrop(@Body() body: { sessionId: string; orderId?: string }, @Request() req: any) {
    if (body.orderId) {
      const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
      const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
      return this.qrService.confirmSessionOrder('DROP', userId, userRole, body.sessionId, body.orderId);
    }
    return this.qrService.confirmSession('DROP', body.sessionId);
  }

  @Post('drop/confirm-order')
  @ApiOperation({ summary: 'Confirm scanned parcels for a specific order in a drop session' })
  async confirmDropOrder(@Body() body: { sessionId: string; orderId: string }, @Request() req: any) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
    return this.qrService.confirmSessionOrder('DROP', userId, userRole, body.sessionId, body.orderId);
  }

  @Get('drop/session')
  @ApiOperation({ summary: 'Retrieve active drop session status' })
  async getDropSession(@Request() req: any, @Query('sessionId') sessionId?: string) {
    const userId = req.user?.id ? String(req.user.id) : 'SYSTEM';
    const userRole = req.user?.role ? String(req.user.role) : 'SYSTEM';
    return this.qrService.getSessionDetails('DROP', userId, userRole, sessionId);
  }
}
