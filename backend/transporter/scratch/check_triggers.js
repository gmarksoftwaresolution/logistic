const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const triggers = await prisma.$queryRaw`
      SELECT 
        trigger_name, 
        event_object_table, 
        action_statement, 
        action_orientation, 
        action_timing
      FROM information_schema.triggers
      WHERE trigger_schema = 'public';
    `;
    console.log('Triggers:', triggers);

    const functions = await prisma.$queryRaw`
      SELECT 
        routine_name, 
        routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public';
    `;
    console.log('Functions:', functions);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
