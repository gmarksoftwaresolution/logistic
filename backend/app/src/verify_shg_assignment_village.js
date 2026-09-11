const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const shgUsers = await prisma.user.findMany({
    where: { role: 'SHG', applicationStatus: 'APPROVED', deletedAt: null },
    include: { address: true }
  });

  console.log("Registered SHGs:");
  for (const u of shgUsers) {
    console.log(`  SHG ID: ${u.id}, Name: ${u.fullName}, Village: ${u.address?.village}, Pincode: ${u.address?.pincode}`);
  }

  // Simulate matching for Inchanal buyer (pincode 416502)
  const bVillageNorm = 'inchanal';
  const bPincode = '416502';

  const normalizeStr = (s) => (s ? s.replace(/[^a-z0-9]/gi, '').trim().toLowerCase() : '');

  // 1. Priority 1: Match BOTH Village AND Pincode
  let matchedDropShg = shgUsers.find((u) => {
    const vNorm = normalizeStr(u.address?.village);
    const p = (u.address?.pincode || '').trim().toLowerCase();
    return bVillageNorm && vNorm && (vNorm === bVillageNorm || vNorm.includes(bVillageNorm) || bVillageNorm.includes(vNorm)) && (!bPincode || !p || p === bPincode);
  });

  // 2. Priority 2: Match Village exact/substring
  if (!matchedDropShg && bVillageNorm) {
    matchedDropShg = shgUsers.find((u) => {
      const vNorm = normalizeStr(u.address?.village);
      return vNorm && (vNorm === bVillageNorm || vNorm.includes(bVillageNorm) || bVillageNorm.includes(vNorm));
    });
  }

  console.log("\nMatching test for Buyer (Village: Inchanal, Pincode: 416502):");
  if (matchedDropShg) {
    console.log(`  RESULT: Matched SHG ID ${matchedDropShg.id} (${matchedDropShg.fullName}), Village: ${matchedDropShg.address?.village}`);
  } else {
    console.log(`  RESULT: No matching SHG in village Inchanal.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
