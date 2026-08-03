require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('--- GMU Schema Table Row Counts ---');
    const gmuTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'gmu' 
      ORDER BY table_name;
    `);
    
    for (const r of gmuTables.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "gmu"."${r.table_name}"`);
      const count = parseInt(countRes.rows[0].count, 10);
      if (count > 0) {
        console.log(`${r.table_name}: ${count}`);
      }
    }

    console.log('\n--- Public Schema Table Row Counts ---');
    const publicTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    for (const r of publicTables.rows) {
      const countRes = await client.query(`SELECT COUNT(*) FROM "public"."${r.table_name}"`);
      const count = parseInt(countRes.rows[0].count, 10);
      if (count > 0) {
        console.log(`${r.table_name}: ${count}`);
      }
    }

  } catch (err) {
    console.error('Error counting table rows:', err);
  } finally {
    await client.end();
  }
}

main();
