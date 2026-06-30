// Script para crear un trigger en Supabase que auto-sincronice 'name' desde firstName+lastName
// También crea el script SQL de migración en database_scripts/

const triggerSQL = `
-- Función que sincroniza el campo 'name' con firstName + lastName
CREATE OR REPLACE FUNCTION sync_user_full_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."firstName" IS NOT NULL OR NEW."lastName" IS NOT NULL THEN
    NEW.name := TRIM(COALESCE(NEW."firstName", '') || ' ' || COALESCE(NEW."lastName", ''));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que se ejecuta en INSERT y UPDATE
DROP TRIGGER IF EXISTS trg_sync_full_name ON "userProfiles";
CREATE TRIGGER trg_sync_full_name
  BEFORE INSERT OR UPDATE OF "firstName", "lastName"
  ON "userProfiles"
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_full_name();
`;

async function run() {
  const token = 'YOUR_SUPABASE_PAT';
  const projectRef = 'gjsszyplfzpfwxsblkve';

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: triggerSQL }),
  });
  const data = await res.json();
  console.log('Trigger creation result:', JSON.stringify(data, null, 2));
}

run().catch(console.error);
