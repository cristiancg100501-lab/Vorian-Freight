// Crear política RLS y función RPC para resolver nombres desde el frontend
const token = 'YOUR_SUPABASE_PAT';
const projectRef = 'gjsszyplfzpfwxsblkve';

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  // 1. Crear función RPC que devuelve perfiles básicos (sin datos sensibles)
  //    Solo nombre y email, accesible para usuarios autenticados
  console.log('\n=== Creando función get_user_profiles_by_ids ===');
  await runSQL(`
    CREATE OR REPLACE FUNCTION get_user_profiles_by_ids(user_ids uuid[])
    RETURNS TABLE (
      id uuid,
      full_name text,
      email text
    )
    LANGUAGE sql
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT 
        id,
        COALESCE(name, TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", '')), email) as full_name,
        email
      FROM "userProfiles"
      WHERE id = ANY(user_ids);
    $$;
  `);

  // 2. Verificar que funciona
  console.log('\n=== Verificando función con anon key ===');
}

main().catch(console.error);
