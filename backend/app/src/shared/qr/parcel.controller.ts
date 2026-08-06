import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { QrService } from './qr.service';

@ApiTags('Parcels')
@Controller('parcel')
export class ParcelController {
  constructor(private readonly qrService: QrService) {}

  @Get(':parcelId')
  @ApiOperation({ summary: 'Get details of a specific parcel' })
  async getParcel(@Param('parcelId') parcelId: string) {
    return this.qrService.getParcel(parcelId);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get all parcels belonging to an order' })
  async getOrderParcels(@Param('orderId') orderId: string) {
    return this.qrService.getOrderParcels(orderId);
  }

  @Get('history/:parcelId')
  @ApiOperation({ summary: 'Get full scan history for a parcel' })
  async getHistory(@Param('parcelId') parcelId: string) {
    return this.qrService.getHistory(parcelId);
  }
}
