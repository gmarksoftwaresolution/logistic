require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({ connectionString });
  await client.connect();

  try {
    console.log('Migrating CommunityMember table...');
    // Check if table already exists in public
    const checkComm = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'CommunityMember'
      );
    `);
    
    if (!checkComm.rows[0].exists) {
      // Create and copy table
      await client.query(`CREATE TABLE public."CommunityMember" AS SELECT * FROM gmu."CommunityMember";`);
      // Add primary key
      await client.query(`ALTER TABLE public."CommunityMember" ADD PRIMARY KEY (id);`);
      // Add unique constraint
      await client.query(`ALTER TABLE public."CommunityMember" ADD CONSTRAINT "CommunityMember_memberCode_key" UNIQUE ("memberCode");`);
      console.log('CommunityMember table migrated successfully.');
    } else {
      console.log('CommunityMember table already exists in public schema.');
    }

    console.log('Migrating TransporterMember table...');
    // Check if table already exists in public
    const checkTrans = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'TransporterMember'
      );
    `);
    
    if (!checkTrans.rows[0].exists) {
      // Create and copy table
      await client.query(`CREATE TABLE public."TransporterMember" AS SELECT * FROM gmu."TransporterMember";`);
      // Add primary key
      await client.query(`ALTER TABLE public."TransporterMember" ADD PRIMARY KEY (id);`);
      // Add unique constraint
      await client.query(`ALTER TABLE public."TransporterMember" ADD CONSTRAINT "TransporterMember_transporterCode_key" UNIQUE ("transporterCode");`);
      console.log('TransporterMember table migrated successfully.');
    } else {
      console.log('TransporterMember table already exists in public schema.');
    }

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

main();
