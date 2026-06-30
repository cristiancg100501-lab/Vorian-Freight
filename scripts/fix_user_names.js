// Script para corregir el campo 'name' en userProfiles
// Construye name = firstName + ' ' + lastName donde name es NULL

const sql = `
UPDATE "userProfiles" 
SET name = TRIM(COALESCE("firstName", '') || ' ' || COALESCE("lastName", ''))
WHERE name IS NULL AND ("firstName" IS NOT NULL OR "lastName" IS NOT NULL)
`;

const verifySql = `
SELECT id, name, "firstName", "lastName", role 
FROM "userProfiles" 
ORDER BY "createdAt" DESC 
LIMIT 10
`;

async function run() {
  const token = 'YOUR_SUPABASE_PAT';
  const projectRef = 'gjsszyplfzpfwxsblkve';

  // Update
  const res1 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const data1 = await res1.json();
  console.log('UPDATE result:', JSON.stringify(data1, null, 2));

  // Verify
  const res2 = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: verifySql }),
  });
  const data2 = await res2.json();
  console.log('\nVerification (userProfiles after update):');
  console.log(JSON.stringify(data2, null, 2));
}

run().catch(console.error);
