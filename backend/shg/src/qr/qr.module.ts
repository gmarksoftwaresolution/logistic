import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QrService } from './qr.service';
import { QrController } from './qr.controller';
import { ParcelController } from './parcel.controller';

@Module({
  imports: [PrismaModule],
  controllers: [QrController, ParcelController],
  providers: [QrService],
  exports: [QrService],
})
export class QrModule {}
