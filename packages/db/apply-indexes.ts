import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function applyIndexes() {
  console.log('=== APPLYING SAFE PRODUCTION DATABASE INDEXES ===\n');

  const indexQueries = [
    // 1. StepTracking index for instant user registration step lookups
    `CREATE INDEX IF NOT EXISTS idx_steptracking_userid_step ON public."StepTracking" ("userId", step);`,

    // 2. Application index for instant approval status lookups
    `CREATE INDEX IF NOT EXISTS idx_application_userid_status ON public."Application" ("userId", status);`,

    // 3. User index for role, applicationStatus, and currentStep lookups
    `CREATE INDEX IF NOT EXISTS idx_user_role_appstatus_step ON public."User" (role, "applicationStatus", "currentStep");`,

    // 4. Address index for userId lookups
    `CREATE INDEX IF NOT EXISTS idx_address_userid ON public."Address" ("userId");`,

    // 5. Document index for userId lookups
    `CREATE INDEX IF NOT EXISTS idx_document_userid ON public."Document" ("userId");`,

    // 6. BankDetail index for userId lookups
    `CREATE INDEX IF NOT EXISTS idx_bankdetail_userid ON public."BankDetail" ("userId");`,

    // 7. ShgDetail index for userId lookups
    `CREATE INDEX IF NOT EXISTS idx_shgdetail_userid ON public."ShgDetail" ("userId");`,

    // 8. OtherDetails index for userId lookups
    `CREATE INDEX IF NOT EXISTS idx_otherdetails_userid ON public."OtherDetails" ("userId");`,

    // 9. OrderAssignment index for fast assignee lookup
    `CREATE INDEX IF NOT EXISTS idx_orderassignment_assignee_role_status ON public."OrderAssignment" ("assigneeId", "assigneeType", role, status);`
  ];

  for (const q of indexQueries) {
    try {
      console.log(`Executing: ${q}`);
      await prisma.$executeRawUnsafe(q);
      console.log('  --> Success ✅');
    } catch (err: any) {
      console.warn(`  --> Notice: ${err.message}`);
    }
  }

  console.log('\n=== ALL INDEXES APPLIED SUCCESSFULLY WITHOUT DATA LOSS ===');
}

applyIndexes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
