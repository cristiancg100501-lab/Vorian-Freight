const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data: users, error } = await supabase.from('userProfiles').select('id, role, firstName, lastName, "Company_name"').order('createdAt', {ascending: false}).limit(5);
  console.log("Error:", error);
}
run();
