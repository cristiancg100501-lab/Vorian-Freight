const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function run() {
  const { data, error } = await supabase.rpc('get_handle_new_user_definition').catch(() => ({}));
  // We can't do this easily. I will just query pg_proc.
  const { data: procs } = await supabase.rpc('get_function_def', { func_name: 'handle_new_user' });
  console.log("Functions:", procs);
}
run();
