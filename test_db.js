import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gjsszyplfzpfwxsblkve.supabase.co',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY'
);

async function main() {
  const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  console.log("Checking shipments created after:", fortyFiveMinsAgo);
  const { data, error } = await supabase
    .from('shipments')
    .select('id, createdAt, origin, pickup_latitude, pickup_longitude');
    
  if (error) console.error(error);
  console.log("Total shipments:", data ? data.length : 0);
  
  if (data) {
    const recent = data.filter(s => new Date(s.createdAt) > new Date(fortyFiveMinsAgo));
    console.log(`Recent shipments (last 45m based on JS date): ${recent.length}`);
    
    // Check if the query itself is working
    const { data: recentQuery } = await supabase
      .from('shipments')
      .select('id, createdAt, pickup_latitude')
      .gte('createdAt', fortyFiveMinsAgo);
    
    console.log("Recent shipments (via .gte query):", recentQuery ? recentQuery.length : 0);
    if (recent.length > 0) {
      console.log("Sample:", recent[recent.length - 1]);
    }
  }
}

main();
