const fs = require('fs');
const postgres = require('postgres');

if (!process.env.DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL);

async function run() {
  try {
    const query = fs.readFileSync('CREATE_TRIGGER_SYNC_WINDOWS.sql', 'utf8');
    console.log("Ejecutando script SQL para crear el Trigger en Supabase...");
    await sql.unsafe(query);
    console.log("✅ Trigger creado y datos históricos sincronizados correctamente!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await sql.end();
  }
}

run();
