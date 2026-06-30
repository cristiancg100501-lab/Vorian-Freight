const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://gjsszyplfzpfwxsblkve.supabase.co',
  'YOUR_SUPABASE_SERVICE_ROLE_KEY'
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
