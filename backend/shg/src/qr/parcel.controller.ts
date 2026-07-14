import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { QrService } from './qr.service';

@ApiTags('Parcel Operations')
@Controller('parcel')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ParcelController {
  constructor(private readonly qrService: QrService) {}

  @Get(':parcelId')
  @ApiOperation({ summary: 'Get details for a parcel' })
  async getParcel(@Param('parcelId') parcelId: string) {
    return this.qrService.getParcel(parcelId);
  }

  @Get(':parcelId/history')
  @ApiOperation({ summary: 'Get scan history for a parcel' })
  async getHistory(@Param('parcelId') parcelId: string) {
    return this.qrService.getHistory(parcelId);
  }
}
