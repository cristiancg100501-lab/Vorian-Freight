const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://gjsszyplfzpfwxsblkve.supabase.co', 'YOUR_SUPABASE_SERVICE_ROLE_KEY');

async function test() {
    const { data } = await supabase.from('porticos').select('id, name, reference_code, tariffs_json').eq('reference_code', 'T1');
    console.log(JSON.stringify(data, null, 2));
}
test();
