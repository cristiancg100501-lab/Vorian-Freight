const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    await client.connect();
    
    // Add maxPayload (numeric)
    console.log("Adding maxPayload...");
    await client.query('ALTER TABLE "vehicleRates" ADD COLUMN IF NOT EXISTS "maxPayload" numeric;');
    
    // Add lastUpdatedAt (timestamp)
    console.log("Adding lastUpdatedAt...");
    await client.query('ALTER TABLE "vehicleRates" ADD COLUMN IF NOT EXISTS "lastUpdatedAt" timestamp with time zone;');
    
    // Add lastUpdatedByUserId (uuid)
    console.log("Adding lastUpdatedByUserId...");
    await client.query('ALTER TABLE "vehicleRates" ADD COLUMN IF NOT EXISTS "lastUpdatedByUserId" uuid;');
    
    console.log("Columns added successfully!");
  } catch (err) {
    console.error("Error modifying table:", err);
  } finally {
    await client.end();
  }
}
run();
