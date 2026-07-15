const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.xbzmwdluefqbhicynhnp:Shridhar@21@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres"
    }
  }
});

async function main() {
  console.log("Checking User with ID 433...");
  const user = await prisma.user.findFirst({
    where: { id: 433 }
  });
  console.log("User:", JSON.stringify(user, null, 2));

  if (!user) {
    console.log("No user found with ID 433. Let's list recent users:");
    const recentUsers = await prisma.user.findMany({
      orderBy: { id: 'desc' },
      take: 5
    });
    console.log(JSON.stringify(recentUsers, null, 2));
    return;
  }

  console.log("\nChecking StepTracking for user 433...");
  const steps = await prisma.stepTracking.findMany({
    where: { userId: 433 }
  });
  console.log("StepTracking count:", steps.length);
  for (const step of steps) {
    console.log(`Step ${step.step}:`, JSON.stringify(step.data, null, 2));
  }

  console.log("\nChecking OtherDetails for user 433...");
  const otherDetails = await prisma.otherDetails.findMany({
    where: { userId: 433 }
  });
  console.log("OtherDetails:", JSON.stringify(otherDetails, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
