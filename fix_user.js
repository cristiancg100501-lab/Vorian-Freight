const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const userId = '6c7fc1b6-26d1-4160-bf3e-97892614bc1c';
  
  // Update Company_name in userProfiles to fallback to their name
  await supabase.from('userProfiles').update({ 'Company_name': 'Perez Jimenez (Customer)' }).eq('id', userId);
  
  // Insert into clientProfiles
  await supabase.from('clientProfiles').upsert({
    id: userId,
    userId: userId,
    companyName: 'Perez Jimenez (Customer)',
    rut: '12345678-9',
    address: 'Por completar'
  });
  
  // Insert into companies
  const { data: comp } = await supabase.from('companies').insert({
    company_name: 'Perez Jimenez (Customer)',
    trade_name: 'Perez Jimenez (Customer)',
    type: 'CUSTOMER',
    verification_status: 'APPROVED'
  }).select('id').single();
  
  if (comp) {
    await supabase.from('company_members').upsert({
      company_id: comp.id,
      user_id: userId,
      member_role: 'OWNER'
    });
  }
  
  console.log("Fixed user 6c7fc1b6-26d1-4160-bf3e-97892614bc1c");
}
run();
