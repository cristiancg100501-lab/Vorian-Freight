const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gjsszyplfzpfwxsblkve.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3N6eXBsZnpwZnd4c2Jsa3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDM4MiwiZXhwIjoyMDkwODE2MzgyfQ.HJpqe9XNMjWlHLEX84FWtNQQ0F_z7qj7cp9yrOsNHUw');

async function test() {
    const { data: all } = await supabase.from('porticos').select('id, name, reference_code');
    const grouped = {};
    all.forEach(p => {
        let key = p.reference_code ? `ref_${p.reference_code}` : `name_${p.name}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(p);
    });
    const dupes = Object.entries(grouped).filter(([k, arr]) => arr.length > 1);
    console.log(`Hay ${dupes.length} grupos de pórticos duplicados en la BD actual.`);
}
test();
