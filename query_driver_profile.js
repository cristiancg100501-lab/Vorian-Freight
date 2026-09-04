const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://gjsszyplfzpfwxsblkve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3N6eXBsZnpwZnd4c2Jsa3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDM4MiwiZXhwIjoyMDkwODE2MzgyfQ.HJpqe9XNMjWlHLEX84FWtNQQ0F_z7qj7cp9yrOsNHUw'
);

async function run() {
  // 1. Find all drivers in userProfiles
  const { data: drivers, error: e1 } = await supabase
    .from('userProfiles')
    .select('id, email, firstName, lastName, role, company_id')
    .eq('role', 'driver')
    .limit(5);
  console.log("=== DRIVERS in userProfiles ===");
  console.log(JSON.stringify(drivers, null, 2));
  if (e1) console.log("Error:", e1);

  // 2. Check driverProfiles for these drivers
  if (drivers && drivers.length > 0) {
    for (const d of drivers) {
      const { data: dp, error: e2 } = await supabase
        .from('driverProfiles')
        .select('id, companyId, company_id')
        .eq('id', d.id)
        .maybeSingle();
      console.log(`\n=== driverProfile for ${d.firstName} ${d.lastName} (${d.id}) ===`);
      console.log(JSON.stringify(dp, null, 2));
      if (e2) console.log("Error:", e2);
    }
  }

  // 3. Check companies table
  const { data: companies, error: e3 } = await supabase
    .from('companies')
    .select('id, company_name, trade_name, phone, type')
    .limit(5);
  console.log("\n=== COMPANIES ===");
  console.log(JSON.stringify(companies, null, 2));
  if (e3) console.log("Error:", e3);

  // 4. Check companyProfiles table
  const { data: companyProfiles, error: e4 } = await supabase
    .from('companyProfiles')
    .select('*')
    .limit(5);
  console.log("\n=== COMPANY PROFILES ===");
  console.log(JSON.stringify(companyProfiles, null, 2));
  if (e4) console.log("Error:", e4);

  // 5. Check company_members
  const { data: members, error: e5 } = await supabase
    .from('company_members')
    .select('*')
    .limit(10);
  console.log("\n=== COMPANY MEMBERS ===");
  console.log(JSON.stringify(members, null, 2));
  if (e5) console.log("Error:", e5);
}
run();
