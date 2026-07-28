const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data: clients, error } = await supabase.from('clientProfiles').select('*').limit(1);
  console.log("ClientProfiles columns:", Object.keys(clients[0] || {}), error);
}
run();
