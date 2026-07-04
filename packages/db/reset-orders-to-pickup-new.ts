process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/logistic_db?schema=public";
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Resetting all orders in database back to Phase 1 Pickup New Orders...');

  await prisma.$transaction(async (tx) => {
    // 1. Delete all drop orders and tracking to start Phase 2 fresh
    console.log('- Clearing Drop Orders & Tracking...');
    await tx.$executeRawUnsafe(`DELETE FROM public.drop_tracking;`);
    await tx.$executeRawUnsafe(`DELETE FROM public.drop_order_items;`);
    await tx.$executeRawUnsafe(`DELETE FROM public.drop_orders;`);

    // 2. Delete verification records except for setup/initial ones
    console.log('- Clearing verification records...');
    await tx.$executeRawUnsafe(`DELETE FROM public."VerificationRecord";`);
    await tx.$executeRawUnsafe(`DELETE FROM public."ScanHistory";`);
    await tx.$executeRawUnsafe(`DELETE FROM public.pickup_tracking;`);

    // 3. Reset pickup_orders to PENDING
    console.log('- Resetting public.pickup_orders...');
    await tx.$executeRawUnsafe(`
      UPDATE public.pickup_orders
      SET status = 'PENDING', "shg_id" = NULL, "transporter_id" = NULL, "pickup_time" = NULL;
    `);

    // 4. Reset master_orders status to ORDER_PLACED
    console.log('- Resetting public.master_orders...');
    await tx.$executeRawUnsafe(`
      UPDATE public.master_orders
      SET status = 'ORDER_PLACED';
    `);

    // 5. Delete all order assignments in GMU schema
    console.log('- Clearing gmu.OrderAssignment...');
    await tx.$executeRawUnsafe(`DELETE FROM gmu."OrderAssignment";`);

    // 6. Reset gmu.Order to initial pickup state
    console.log('- Resetting gmu.Order to ORDER_PLACED and PICKUP phase...');
    await tx.$executeRawUnsafe(`
      UPDATE gmu."Order"
      SET 
        phase = 'PICKUP',
        "mainStatus" = 'ORDER_PLACED',
        "pickupShgId" = NULL,
        "pickupShgStatus" = NULL,
        "pickupTransporterId" = NULL,
        "pickupTransporterStatus" = 'PENDING',
        "dropShgId" = NULL,
        "dropShgStatus" = 'PENDING',
        "dropTransporterId" = NULL,
        "dropTransporterStatus" = 'PENDING',
        "barcode" = NULL,
        "updatedAt" = NOW();
    `);
  });

  console.log('Success! All orders have been reset to Phase 1 (Pickup Leg - New Orders).');
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
