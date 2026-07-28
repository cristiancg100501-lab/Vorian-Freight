const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data: users, error } = await supabase.from('userProfiles').select('id, role, name');
  console.log("Users:", users?.length, "Error:", error);
}
run();
