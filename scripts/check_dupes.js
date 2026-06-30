const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gjsszyplfzpfwxsblkve.supabase.co', 'YOUR_SUPABASE_SERVICE_ROLE_KEY');

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
