const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://gjsszyplfzpfwxsblkve.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3N6eXBsZnpwZnd4c2Jsa3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDM4MiwiZXhwIjoyMDkwODE2MzgyfQ.HJpqe9XNMjWlHLEX84FWtNQQ0F_z7qj7cp9yrOsNHUw'
);

async function check() {
  const { data, error } = await supabase.from('porticos').select('id, name, reference_code, latitude, tariffs_json').limit(10);
  if (error) {
     console.error(error);
  } else {
     console.log(JSON.stringify(data, null, 2));
  }
}

check();
