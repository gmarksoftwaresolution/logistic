import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { ParcelController } from './parcel.controller';
import { QrService } from './qr.service';

@Module({
  controllers: [QrController, ParcelController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
