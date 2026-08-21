import { Module } from '@nestjs/common';
import { OrderManagementController } from './order-management.controller';
import { OrderManagementService } from './order-management.service';
import { QrModule } from '../../../shared/qr/qr.module';
import { OrderModule as TransporterOrderModule } from '../../transporter/order/order.module';
import { OrderModule as ShgOrderModule } from '../../shg/order/order.module';

import { LocationModule } from '../../../shared/location/location.module';

@Module({
  imports: [QrModule, TransporterOrderModule, ShgOrderModule, LocationModule],
  controllers: [OrderManagementController],
  providers: [OrderManagementService],
  exports: [OrderManagementService],
})
export class OrderManagementModule {}
