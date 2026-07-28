const postgres = require('postgres');
const fs = require('fs');

async function run() {
  const sqlString = fs.readFileSync('database_scripts/CREATE_DRIVER_LOCATION_LOGS.sql', 'utf8');
  
  // Try connecting with pooler URL 6543
  const sql = postgres("postgres://postgres.xstozcnyhuzguxkndnjb:rXwI4vjY0a2W8wH1@aws-0-sa-east-1.pooler.supabase.com:6543/postgres", { ssl: 'require' });

  try {
    await sql.unsafe(sqlString);
    console.log("Success SQL execution via postgresjs!");
  } catch (err) {
    console.error("Error executing SQL:", err);
  } finally {
    await sql.end();
  }
}

run();
