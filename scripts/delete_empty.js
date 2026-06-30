const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://gjsszyplfzpfwxsblkve.supabase.co', 'YOUR_SUPABASE_SERVICE_ROLE_KEY');

function hasTariffs(tJson) {
    if (!tJson || typeof tJson !== 'object') return false;
    for (const cat of ['cat1', 'cat2', 'cat3']) {
        if (tJson[cat]) {
            const c = tJson[cat];
            if (parseFloat(c.price_tbfp) > 0 || parseFloat(c.price_tbp) > 0 || parseFloat(c.price_ts) > 0) return true;
            if (c.tbp_laboral || c.tbp_sabado || c.tbp_domingo || c.ts_laboral) return true;
        }
    }
    return false;
}

async function run() {
    console.log("Obteniendo porticos actuales...");
    const { data: allPorticos, error: fetchErr } = await supabase.from('porticos').select('*').limit(2000);
    if (fetchErr) return console.error(fetchErr);

    const deleteIds = [];
    let keptCount = 0;
    
    for (const p of allPorticos) {
        if (!hasTariffs(p.tariffs_json)) {
            deleteIds.push(p.id);
        } else {
            keptCount++;
        }
    }

    console.log(`Pórticos con tarifas (se mantienen): ${keptCount}`);
    console.log(`Pórticos sin tarifas (a eliminar): ${deleteIds.length}`);

    for(let i=0; i<deleteIds.length; i+=100) {
        const batch = deleteIds.slice(i, i+100);
        await supabase.from('porticos').delete().in('id', batch);
        console.log(`Borrados ${Math.min(i+100, deleteIds.length)} de ${deleteIds.length}`);
    }
    console.log("Completado");
}

run();
