const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const sql = fs.readFileSync(path.join(__dirname, 'database_scripts', 'FIX_DRIVER_UPSERT.sql'), 'utf-8');

async function run() {
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
    console.log("Result:", data, error);
}
run();
