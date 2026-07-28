const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase.from('driver_location_logs').select('*');
  console.log("Logs count:", data ? data.length : 0);
  if (data && data.length > 0) {
      console.log("Sample log:", data[0]);
  }
}
run();
