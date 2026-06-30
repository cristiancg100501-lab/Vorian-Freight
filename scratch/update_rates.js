const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gjsszyplfzpfwxsblkve.supabase.co';
const supabaseKey = 'YOUR_SUPABASE_SERVICE_ROLE_KEY'; // Service role key
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRates() {
    console.log('🚀 Iniciando corrección de tarifas Vorian...');
    
    const { data, error } = await supabase
        .from('vehicleRates')
        .update({
            baseFare: 120000,
            costPerKm: 450,
            costPerMinute: 30,
            fuelEfficiency: 3.5
        })
        .eq('id', 'Camion Rampla');

    if (error) {
        console.error('❌ Error actualizando tarifas:', error);
    } else {
        console.log('✅ Tarifas de "Camión Rampla" actualizadas con éxito.');
    }
}

updateRates();
