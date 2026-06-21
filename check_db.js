require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function check() {
  console.log("Checking shipments...");
  const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  
  // Try querying with created_at
  const { data: d1, error: e1 } = await supabase.from('shipments').select('id, created_at').limit(3);
  console.log("With created_at:", d1, e1);

  // Try querying with createdAt
  const { data: d2, error: e2 } = await supabase.from('shipments').select('id, createdAt').limit(3);
  console.log("With createdAt:", d2, e2);
  
  const { data: recent, error: err } = await supabase.from('shipments').select('*').gte('createdAt', fortyFiveMinsAgo);
  console.log("Recent with createdAt:", recent ? recent.length : 0, err);
}
check();
