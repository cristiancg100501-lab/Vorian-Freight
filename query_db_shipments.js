const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data: shipments, error } = await supabase.from('shipments').select('*').limit(1);
  console.log("Columns:", Object.keys(shipments[0] || {}), error);
}
run();
