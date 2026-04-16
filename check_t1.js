const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gjsszyplfzpfwxsblkve.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3N6eXBsZnpwZnd4c2Jsa3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDM4MiwiZXhwIjoyMDkwODE2MzgyfQ.HJpqe9XNMjWlHLEX84FWtNQQ0F_z7qj7cp9yrOsNHUw');

async function test() {
    const { data } = await supabase.from('porticos').select('id, name, reference_code, tariffs_json').eq('reference_code', 'T1');
    console.log(JSON.stringify(data, null, 2));
}
test();
