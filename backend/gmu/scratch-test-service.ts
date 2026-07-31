import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { OrderManagementService } from './src/order-management/order-management.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(OrderManagementService);

  console.log('Fetching pickup new orders from service...');
  try {
    const result = await service.getPickupNewOrders();
    console.log(`Success! Found ${result.length} orders.`);
    if (result.length > 0) {
      console.log('First order:', JSON.stringify(result[0], null, 2));
    }
  } catch (err) {
    console.error('Error fetching from service:', err);
  } finally {
    await app.close();
  }
}

main();
