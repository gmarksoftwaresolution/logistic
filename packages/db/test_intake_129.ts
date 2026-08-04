import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orderId = 'ORD-2026-129';
  console.log('Before intake check for', orderId);
  const before = await prisma.order.findFirst({ where: { orderId } });
  console.log('Before:', { id: before?.id, mainStatus: before?.mainStatus, phase: before?.phase });

  // Call the backend warehouseIntake API endpoint
  const loginRes = await fetch('http://localhost:3001/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobileNumber: '1111111111', otp: '123456' })
  });
  const loginData = await loginRes.json();
  console.log('Login result:', loginData.success);

  const intakeRes = await fetch(`http://localhost:3001/orders/${orderId}/warehouse-intake`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
  });
  const intakeData = await intakeRes.json();
  console.log('Intake API response:', intakeData);

  console.log('After intake check for', orderId);
  const after = await prisma.order.findMany({ where: { OR: [{ orderId }, { id: before?.id }] } });
  after.forEach(o => {
    console.log('After row:', { id: o.id, phase: o.phase, mainStatus: o.mainStatus, pickupTransporterStatus: o.pickupTransporterStatus, storedAt: o.storedAt });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
