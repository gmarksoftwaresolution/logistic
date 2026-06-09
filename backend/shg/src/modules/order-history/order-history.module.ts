import { Module } from '@nestjs/common';
import { OrderHistoryController } from './controller/order-history.controller';
import { OrderHistoryService } from './service/order-history.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OrderHistoryController],
  providers: [OrderHistoryService],
})
export class OrderHistoryModule {}
