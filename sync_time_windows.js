const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltan credenciales de Supabase en .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncTimeWindows() {
  console.log("Iniciando sincronización de ventanas horarias...");

  // Obtener todos los pórticos
  const { data: porticos, error } = await supabase.from('porticos').select('id, tariffs_json');
  
  if (error) {
    console.error("Error al obtener los pórticos:", error);
    return;
  }

  let updatedCount = 0;

  for (const portico of porticos) {
    if (!portico.tariffs_json || !portico.tariffs_json.cat3) continue;

    const cat3 = portico.tariffs_json.cat3;
    let needsUpdate = false;
    
    const fieldsToSync = ['tbp_sabado', 'ts_laboral', 'tbp_domingo', 'tbp_laboral'];
    const newTariffs = { ...portico.tariffs_json };

    ['cat1', 'cat2'].forEach(cat => {
      if (!newTariffs[cat]) {
         newTariffs[cat] = {};
      }
      
      for (const field of fieldsToSync) {
        if (newTariffs[cat][field] !== cat3[field]) {
          newTariffs[cat][field] = cat3[field];
          needsUpdate = true;
        }
      }
    });

    if (needsUpdate) {
      const { error: updateError } = await supabase
        .from('porticos')
        .update({ tariffs_json: newTariffs })
        .eq('id', portico.id);

      if (updateError) {
        console.error(`Error actualizando el pórtico ${portico.id}:`, updateError);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`✅ Sincronización completada. Se actualizaron ${updatedCount} pórticos.`);
}

syncTimeWindows();
