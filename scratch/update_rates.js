const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gjsszyplfzpfwxsblkve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3N6eXBsZnpwZnd4c2Jsa3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDM4MiwiZXhwIjoyMDkwODE2MzgyfQ.HJpqe9XNMjWlHLEX84FWtNQQ0F_z7qj7cp9yrOsNHUw'; // Service role key
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
