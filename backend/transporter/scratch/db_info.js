const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name, column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `;
    
    // Group columns by table_name
    const schema = {};
    for (const row of tables) {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable,
        default: row.column_default
      });
    }
    
    console.log(JSON.stringify(schema, null, 2));
  } catch (error) {
    console.error('Error fetching schema info:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
