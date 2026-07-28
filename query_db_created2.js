const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data: users, error } = await supabase.from('userProfiles').select('id, role, firstName, lastName, "Company_name"').limit(5);
  console.log("Users:", users);
  
  const { data: clients } = await supabase.from('clientProfiles').select('id, companyName').limit(5);
  console.log("Clients:", clients);
  
  const { data: companies } = await supabase.from('companies').select('id, company_name, type').limit(5);
  console.log("Companies:", companies);
}
run();
