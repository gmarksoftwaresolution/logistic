import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPaths = [
  path.join(__dirname, '../../.env'),
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const dropOrderId = 12; // Let's check the dropOrder ID first, or find the dropOrder for ORD-PICK-1009
  
  const dropOrder = await prisma.dropOrder.findFirst({
    where: { masterOrder: { orderNumber: 'ORD-PICK-1009' } }
  });
  
  if (!dropOrder) {
    console.error('Drop order not found for ORD-PICK-1009');
    return;
  }
  
  console.log('Found DropOrder:', dropOrder);
  
  const masterOrder = await prisma.masterOrder.findUnique({
    where: { id: dropOrder.masterOrderId }
  });
  
  if (!masterOrder) {
    console.error('MasterOrder not found');
    return;
  }
  
  // Let's reset the database state first to replicate what happens when confirming delivery:
  // DropOrder.status = 'PICKED_UP'
  // public."Order".mainStatus = 'IN_TRANSIT_TO_BUYER', dropShgStatus = 'PICKED'
  console.log('Resetting states to simulate active delivery...');
  await prisma.dropOrder.update({
    where: { id: dropOrder.id },
    data: { status: 'PICKED_UP' }
  });
  await prisma.$executeRawUnsafe(`
    UPDATE public."Order"
    SET "mainStatus" = 'IN_TRANSIT_TO_BUYER', "dropShgStatus" = 'PICKED', "updatedAt" = NOW() - INTERVAL '1 minute'
    WHERE "orderId" = $1 AND phase = 'DROP';
  `, masterOrder.orderNumber);
  
  console.log('States reset successfully. Now executing the transaction...');
  
  const result = await prisma.$transaction(async (tx: any) => {
    const nextStatus = (dropOrder.status === 'RETURN_ACCEPTED' || dropOrder.status === 'RETURN_PICKED_UP') ? 'RETURNED' : 'DELIVERED';
    console.log('nextStatus for DropOrder:', nextStatus);
    
    const updated = await tx.dropOrder.update({
      where: { id: dropOrder.id },
      data: { status: nextStatus },
    });

    const nextGmuStatus = nextStatus === 'RETURNED' ? 'RETURNED' : 'DELIVERED';
    console.log('nextGmuStatus for public.Order:', nextGmuStatus);
    
    const affected = await tx.$executeRawUnsafe(`
      UPDATE public."Order"
      SET "dropShgStatus" = 'DROPPED', "mainStatus" = $1, "updatedAt" = NOW()
      WHERE "orderId" = $2 AND phase = 'DROP';
    `, nextGmuStatus, masterOrder.orderNumber);
    
    console.log('executeRawUnsafe affected rows:', affected);

    await tx.masterOrder.update({
      where: { id: dropOrder.masterOrderId },
      data: { status: nextGmuStatus },
    });

    return updated;
  });
  
  console.log('Transaction result:', result);
  
  // Verify final database state
  const finalDropOrder = await prisma.dropOrder.findUnique({ where: { id: dropOrder.id } });
  const finalGmuOrder = await prisma.$queryRawUnsafe(`
    SELECT "orderId", "mainStatus", "dropShgStatus", "updatedAt" FROM public."Order" WHERE "orderId" = $1 AND phase = 'DROP';
  `, masterOrder.orderNumber) as any[];
  
  console.log('Final DropOrder status:', finalDropOrder?.status);
  console.log('Final public.Order:', finalGmuOrder[0]);
}

main().finally(() => prisma.$disconnect());
