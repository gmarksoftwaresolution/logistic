import { Module } from '@nestjs/common';
import { TransporterManagementController } from './transporter-management.controller';
import { TransporterManagementService } from './transporter-management.service';
import { OrderManagementModule } from '../order-management/order-management.module';

@Module({
  imports: [OrderManagementModule],
  controllers: [TransporterManagementController],
  providers: [TransporterManagementService],
  exports: [TransporterManagementService],
})
export class TransporterManagementModule {}
