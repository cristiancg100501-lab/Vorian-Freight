const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL
});
async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT pg_get_functiondef(p.oid) AS func_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.proname = 'get_vorian_price_ftl'
    AND n.nspname = 'public';
  `);
  console.log(res.rows[0].func_def);
  await client.end();
}
run().catch(console.error);
