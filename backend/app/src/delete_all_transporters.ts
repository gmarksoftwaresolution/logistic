import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeAllTransporters() {
  console.log('====================================================');
  console.log('=== REMOVING ALL TRANSPORTERS & RELATED DATA ===');
  console.log('====================================================\n');

  // 1. Find all users with role TRANSPORTER or having transporter-specific tables
  const transporterUsers = await prisma.user.findMany({
    where: {
      OR: [
        { role: 'TRANSPORTER' },
        { transporterDetail: { isNot: null } },
        { drivingDetail: { isNot: null } },
        { milkVanDetail: { isNot: null } },
        { routeDetail: { isNot: null } },
      ],
    },
    select: {
      id: true,
      phoneNumber: true,
      fullName: true,
      uniqueCode: true,
      authId: true,
    },
  });

  const transporterIds = transporterUsers.map((u) => u.id);
  const transporterCodes = transporterUsers
    .map((u) => u.uniqueCode)
    .filter((c): c is string => Boolean(c));
  const transporterAuthIds = transporterUsers
    .map((u) => u.authId)
    .filter((a): a is string => Boolean(a));
  const transporterStringIds = transporterIds.map(String);

  console.log(`Found ${transporterUsers.length} transporter users to remove:`);
  for (const u of transporterUsers) {
    console.log(` - ID: ${u.id}, Phone: ${u.phoneNumber}, Name: ${u.fullName}, UniqueCode: ${u.uniqueCode}`);
  }
  console.log('\n');

  if (transporterIds.length === 0) {
    console.log('No transporter records found to delete.');
    return;
  }

  // 2. Unassign from Orders
  const unassignedOrders = await prisma.order.updateMany({
    where: {
      OR: [
        { pickupTransporterId: { in: [...transporterStringIds, ...transporterCodes, ...transporterAuthIds] } },
        { dropTransporterId: { in: [...transporterStringIds, ...transporterCodes, ...transporterAuthIds] } },
        { returnTransporterId: { in: [...transporterStringIds, ...transporterCodes, ...transporterAuthIds] } },
      ],
    },
    data: {
      pickupTransporterId: null,
      dropTransporterId: null,
      returnTransporterId: null,
      pickupTransporterStatus: null,
      dropTransporterStatus: null,
    },
  });
  console.log(`✅ Unlinked transporters from ${unassignedOrders.count} Orders`);

  // 3. Unassign from PickupOrders, DropOrders, ReturnOrders
  await prisma.pickupOrder.updateMany({
    where: { transporterId: { in: transporterIds } },
    data: { transporterId: null },
  }).catch(() => {});

  await prisma.dropOrder.updateMany({
    where: { transporterId: { in: transporterIds } },
    data: { transporterId: null },
  }).catch(() => {});

  await prisma.returnOrder.updateMany({
    where: { transporterId: { in: transporterIds } },
    data: { transporterId: null },
  }).catch(() => {});

  // 4. Delete OrderAssignments for transporters
  const deletedAssignments = await prisma.orderAssignment.deleteMany({
    where: {
      OR: [
        { assigneeId: { in: [...transporterStringIds, ...transporterCodes, ...transporterAuthIds] } },
        { role: 'TRANSPORTER' },
      ],
    },
  }).catch(() => ({ count: 0 }));
  console.log(`✅ Deleted ${deletedAssignments.count} OrderAssignment records`);

  // 5. Delete specific Transporter child tables
  const delTransDetail = await prisma.transporterDetail.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delTransDetail.count} TransporterDetail records`);

  const delDriving = await prisma.drivingDetail.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delDriving.count} DrivingDetail records`);

  const delRoute = await prisma.routeDetail.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delRoute.count} RouteDetail records`);

  const delMilkVan = await prisma.milkVanDetail.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delMilkVan.count} MilkVanDetail records`);

  // 6. Delete user-level relations for these transporters
  const delBank = await prisma.bankDetail.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delBank.count} BankDetail records`);

  const delDocs = await prisma.document.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delDocs.count} Document records`);

  const delOther = await prisma.otherDetails.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delOther.count} OtherDetails records`);

  const delAddress = await prisma.address.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delAddress.count} Address records`);

  const delApps = await prisma.application.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delApps.count} Application records`);

  const delStep = await prisma.stepTracking.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delStep.count} StepTracking records`);

  const delAudit = await prisma.auditLog.deleteMany({
    where: { userId: { in: transporterIds } },
  });
  console.log(`✅ Deleted ${delAudit.count} AuditLog records`);

  // 7. Delete OTP Verification records for transporter phone numbers
  const transporterPhones = transporterUsers.map((u) => u.phoneNumber).filter(Boolean);
  const delOtp = await prisma.oTPVerification.deleteMany({
    where: { phoneNumber: { in: transporterPhones } },
  });
  console.log(`✅ Deleted ${delOtp.count} OTPVerification records`);

  // 8. Delete the Transporter User records themselves
  const delUsers = await prisma.user.deleteMany({
    where: { id: { in: transporterIds } },
  });
  console.log(`\n🎉 Successfully removed all ${delUsers.count} Transporter User records from database!`);
}

removeAllTransporters()
  .catch((e) => {
    console.error('❌ Error removing transporters:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
