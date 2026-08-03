require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('--- GMU Schema Tables ---');
    const gmuTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'gmu' 
      ORDER BY table_name;
    `);
    gmuTables.rows.forEach(r => console.log(r.table_name));

    console.log('\n--- Public Schema Tables ---');
    const publicTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    publicTables.rows.forEach(r => console.log(r.table_name));

  } catch (err) {
    console.error('Error listing tables:', err);
  } finally {
    await client.end();
  }
}

main();
