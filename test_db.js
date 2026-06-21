import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gjsszyplfzpfwxsblkve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3N6eXBsZnpwZnd4c2Jsa3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDM4MiwiZXhwIjoyMDkwODE2MzgyfQ.HJpqe9XNMjWlHLEX84FWtNQQ0F_z7qj7cp9yrOsNHUw'
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
