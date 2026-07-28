const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function test() {
  const { data, error } = await supabase.rpc('query_triggers', { table_name: 'companyProfiles' }).catch(() => ({}));
  console.log("RPC query_triggers exists?", !!data);
}
test();
