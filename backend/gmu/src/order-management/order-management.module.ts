import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QrModule } from '../qr/qr.module';
import { OrderManagementController } from './order-management.controller';
import { OrderManagementService } from './order-management.service';

@Module({
  imports: [PrismaModule, QrModule],
  controllers: [OrderManagementController],
  providers: [OrderManagementService],
  exports: [OrderManagementService],
})
export class OrderManagementModule {}
