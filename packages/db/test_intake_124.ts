import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orderId = 'ORD-2026-124';
  console.log('Testing intake for', orderId);

  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: '1111111111', otp: '123456' })
  });
  const loginData = await loginRes.json();

  const intakeRes = await fetch(`http://localhost:3001/orders/${orderId}/warehouse-intake`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  });
  const intakeData = await intakeRes.json();
  console.log('Intake response:', intakeData.mainStatus || intakeData);

  const updated = await prisma.order.findFirst({ where: { orderId, phase: 'PICKUP' } });
  console.log('DB Pickup Order after intake:', {
    id: updated?.id,
    orderId: updated?.orderId,
    mainStatus: updated?.mainStatus,
    pickupTransporterStatus: updated?.pickupTransporterStatus,
    storedAt: updated?.storedAt,
  });

  const dropOrder = await prisma.order.findFirst({ where: { orderId, phase: 'DROP' } });
  console.log('DB Drop Order after intake:', {
    id: dropOrder?.id,
    orderId: dropOrder?.orderId,
    mainStatus: dropOrder?.mainStatus,
    dropShgStatus: dropOrder?.dropShgStatus,
    phase: dropOrder?.phase,
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
