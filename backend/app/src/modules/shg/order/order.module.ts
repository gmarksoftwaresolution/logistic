import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { InventoryController } from './inventory.controller';
import { VehicleSuggestionService } from './vehicle-suggestion.service';
import { EarningsModule } from '../earnings/earnings.module';

@Module({
  imports: [EarningsModule],
  controllers: [OrderController, InventoryController],
  providers: [OrderService, VehicleSuggestionService],
  exports: [OrderService, VehicleSuggestionService],
})
export class OrderModule {}
