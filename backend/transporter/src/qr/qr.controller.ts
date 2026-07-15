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
}
