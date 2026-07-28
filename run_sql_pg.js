const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.gjsszyplfzpfwxsblkve:Vorian2026*@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const sql = fs.readFileSync('database_scripts/CREATE_DRIVER_LOCATION_LOGS.sql', 'utf8');
  
  try {
    await client.query(sql);
    console.log("Success SQL execution!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await client.end();
  }
}

run();
