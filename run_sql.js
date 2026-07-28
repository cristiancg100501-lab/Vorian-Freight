const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = fs.readFileSync('database_scripts/CREATE_DRIVER_LOCATION_LOGS.sql', 'utf8');

async function run() {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
    console.log("Result:", data, error);
}
run();
