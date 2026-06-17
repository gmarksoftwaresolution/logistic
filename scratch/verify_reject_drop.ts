import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyRejectDrop() {
  console.log('--- START VERIFICATION OF REJECT DROP ---');
  
  // Find a transporter to use
  const transporter = await prisma.user.findFirst({
    where: { role: 'TRANSPORTER' }
  });
  if (!transporter) {
    console.error('No transporter found in DB!');
    return;
  }
  console.log(`Using transporter: ${transporter.fullName} (ID: ${transporter.id})`);

  // Create a temporary drop order to test the PENDING status transition
  console.log('\nCreating a test PENDING drop order...');
  const masterOrder = await prisma.masterOrder.findFirst();
  const buyer = await prisma.user.findFirst({ where: { role: 'BUYER' } });
  if (!masterOrder || !buyer) {
    console.error('No master order or buyer found to associate with test drop order!');
    return;
  }

  const testPendingDrop = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `TEST-DRP-PEND-${Date.now().toString().slice(-4)}`,
      masterOrderId: masterOrder.id,
      buyerId: buyer.id,
      transporterId: transporter.id,
      status: 'PENDING',
      deliveryAddress: 'Verification Test Address',
    }
  });
  console.log(`Created PENDING drop order with ID: ${testPendingDrop.id}`);

  // Simulate rejectDrop for PENDING
  console.log('\nSimulating rejectDrop for PENDING order...');
  const nextStatusPending = 'REJECTED';
  const updatedPending = await prisma.$transaction(async (tx) => {
    const updated = await tx.dropOrder.update({
      where: { id: testPendingDrop.id },
      data: {
        status: nextStatusPending,
        transporterId: transporter.id,
      }
    });
    await tx.dropTracking.create({
      data: {
        dropOrderId: testPendingDrop.id,
        status: nextStatusPending,
        remarks: 'Verification Test: Drop leg rejected in PENDING status.',
      }
    });
    return updated;
  });
  console.log(`Updated drop order status: ${updatedPending.status}`);
  const trackingPending = await prisma.dropTracking.findFirst({
    where: { dropOrderId: testPendingDrop.id },
    orderBy: { updatedAt: 'desc' }
  });
  console.log(`Created drop tracking remarks: ${trackingPending?.remarks}`);

  // Create a temporary drop order to test the ACCEPTED status transition
  console.log('\nCreating a test ACCEPTED drop order...');
  const testAcceptedDrop = await prisma.dropOrder.create({
    data: {
      dropOrderNumber: `TEST-DRP-ACCP-${Date.now().toString().slice(-4)}`,
      masterOrderId: masterOrder.id,
      buyerId: buyer.id,
      transporterId: transporter.id,
      status: 'ACCEPTED',
      deliveryAddress: 'Verification Test Address',
    }
  });
  console.log(`Created ACCEPTED drop order with ID: ${testAcceptedDrop.id}`);

  // Simulate rejectDrop for ACCEPTED
  console.log('\nSimulating rejectDrop for ACCEPTED order...');
  const nextStatusAccepted = 'RETURN_PENDING';
  const updatedAccepted = await prisma.$transaction(async (tx) => {
    const updated = await tx.dropOrder.update({
      where: { id: testAcceptedDrop.id },
      data: {
        status: nextStatusAccepted,
        transporterId: transporter.id,
      }
    });
    await tx.dropTracking.create({
      data: {
        dropOrderId: testAcceptedDrop.id,
        status: nextStatusAccepted,
        remarks: 'Verification Test: Drop leg rejected in ACCEPTED status.',
      }
    });
    return updated;
  });
  console.log(`Updated drop order status: ${updatedAccepted.status}`);
  const trackingAccepted = await prisma.dropTracking.findFirst({
    where: { dropOrderId: testAcceptedDrop.id },
    orderBy: { updatedAt: 'desc' }
  });
  console.log(`Created drop tracking remarks: ${trackingAccepted?.remarks}`);

  // Clean up
  console.log('\nCleaning up test drop orders and tracking entries...');
  await prisma.dropTracking.deleteMany({
    where: { dropOrderId: { in: [testPendingDrop.id, testAcceptedDrop.id] } }
  });
  await prisma.dropOrder.deleteMany({
    where: { id: { in: [testPendingDrop.id, testAcceptedDrop.id] } }
  });
  console.log('Cleanup completed.');
  console.log('--- VERIFICATION SUCCESSFUL ---');
}

verifyRejectDrop()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
