const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://gjsszyplfzpfwxsblkve.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqc3N6eXBsZnpwZnd4c2Jsa3ZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI0MDM4MiwiZXhwIjoyMDkwODE2MzgyfQ.HJpqe9XNMjWlHLEX84FWtNQQ0F_z7qj7cp9yrOsNHUw';
const supabase = createClient(supabaseUrl, supabaseKey);

function getCentroid(coordinates) {
    if (typeof coordinates[0] === 'number') return coordinates;
    let coords = coordinates;
    while (Array.isArray(coords) && typeof coords[0] !== 'number' && typeof coords[0][0] !== 'number') {
        coords = coords[0];
    }
    let sumLng = 0, sumLat = 0, count = 0;
    for (const point of coords) {
        if (Array.isArray(point) && typeof point[0] === 'number') {
            sumLng += point[0];
            sumLat += point[1];
            count++;
        }
    }
    if (count === 0) return [0, 0];
    return [sumLng / count, sumLat / count];
}

async function run() {
    console.log("Leyendo export.geojson...");
    const geojsonData = JSON.parse(fs.readFileSync('./export.geojson', 'utf8'));
    const features = geojsonData.features;

    console.log("Obteniendo porticos actuales de Supabase...");
    const { data: existingPorticos, error: fetchErr } = await supabase.from('porticos').select('*');
    if (fetchErr) {
        console.error("Error fetching porticos:", fetchErr);
        return;
    }
    console.log(`Se econtraron ${existingPorticos.length} pórticos existentes.`);

    let inserted = 0;
    let updated = 0;

    for (const feature of features) {
        let name = feature.properties.name || feature.properties.official_name || "Sin Nombre";
        let ref = feature.properties.ref || null;
        
        let center = [0, 0];
        if (feature.geometry.type === 'Point') {
            center = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            center = getCentroid(feature.geometry.coordinates);
        }

        const [lng, lat] = center;
        
        if (lng === 0 && lat === 0) continue;

        // Try to match existing
        let match = null;
        if (ref) {
            match = existingPorticos.find(p => p.reference_code === ref);
            if (!match) match = existingPorticos.find(p => p.name === name);
        } else {
            match = existingPorticos.find(p => p.name === name);
        }

        const postgisLocation = `SRID=4326;POINT(${lng} ${lat})`;

        if (match) {
            // Update
            const { error: updateErr } = await supabase.from('porticos').update({
                latitude: lat,
                longitude: lng,
                location: postgisLocation,
                // Do not update name if it already exists, or maybe update it if missing? Keep existing.
            }).eq('id', match.id);
            if (updateErr) {
                console.error(`Error updating ${match.name}:`, updateErr.message);
            } else {
                updated++;
            }
        } else {
            // Insert new without tariffs_json
            const { error: insertErr } = await supabase.from('porticos').insert({
                name: name,
                reference_code: ref,
                latitude: lat,
                longitude: lng,
                location: postgisLocation,
                is_active: false
            });
            if (insertErr) {
                console.error(`Error inserting ${name}:`, insertErr.message);
            } else {
                inserted++;
            }
        }
    }

    console.log(`Terminado! Se insertaron ${inserted} nuevos porticos y se actualizaron las coordenadas de ${updated} porticos existentes.`);
}

run();
