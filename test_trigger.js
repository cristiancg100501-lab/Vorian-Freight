const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function test() {
  const { data: companies, error: err } = await supabase.from('companyProfiles').select('id').limit(1);
  if (companies && companies.length > 0) {
    console.log("Updating company", companies[0].id);
    const { error } = await supabase.from('companyProfiles').update({ status: 'approved' }).eq('id', companies[0].id);
    console.log("Update result:", error);
  } else {
    console.log("No companies found or error", err);
  }
}
test();
