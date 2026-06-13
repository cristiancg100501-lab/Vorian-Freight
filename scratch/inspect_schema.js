const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTable() {
  console.log("Inspeccionando tabla userProfiles...");
  
  // Consultar información de columnas
  const { data: columns, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'userProfiles' });
  
  if (colError) {
    console.error("Error al obtener columnas via RPC:", colError);
    // Intento alternativo
    const { data: sample, error: sampleError } = await supabase.from('userProfiles').select('*').limit(1);
    if (sample && sample.length > 0) {
      console.log("Columnas detectadas en muestra:", Object.keys(sample[0]));
    } else {
      console.log("No se pudo obtener muestra o tabla vacía.");
    }
  } else {
    console.log("Columnas:", columns);
  }
}

inspectTable();
