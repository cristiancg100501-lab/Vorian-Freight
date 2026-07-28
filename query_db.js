const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data: companies } = await supabase.from('companies').select('*');
  const { data: users } = await supabase.from('userProfiles').select('id, role, name');
  const { data: companyProfiles } = await supabase.from('companyProfiles').select('id, companyName');
  const { data: clientProfiles } = await supabase.from('clientProfiles').select('id, companyName');
  
  console.log("Companies:", companies?.length);
  console.log("Users:", users?.length);
  console.log("Users by role:", users?.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {}));
  console.log("Company Profiles:", companyProfiles?.length);
  console.log("Client Profiles:", clientProfiles?.length);
}
run();
