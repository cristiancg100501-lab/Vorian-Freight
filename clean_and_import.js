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

// Distance in meters
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
}

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
    console.log("Leyendo export.geojson...");
    const geojsonData = JSON.parse(fs.readFileSync('./export.geojson', 'utf8'));
    const features = geojsonData.features;

    console.log("Obteniendo porticos actuales de Supabase (max 2000)...");
    const { data: allPorticos, error: fetchErr } = await supabase.from('porticos').select('*').limit(2000);
    if (fetchErr) {
        console.error("Error fetching porticos:", fetchErr);
        return;
    }
    console.log(`Se econtraron ${allPorticos.length} pórticos existentes.`);

    // 1. Separate kept vs to_delete
    const keptPorticos = [];
    const deleteIds = [];
    
    for (const p of allPorticos) {
        if (hasTariffs(p.tariffs_json)) {
            keptPorticos.push(p);
        } else {
            deleteIds.push(p.id);
        }
    }

    console.log(`- Pórticos con tarifas (se mantienen): ${keptPorticos.length}`);
    console.log(`- Pórticos sin tarifas (se eliminarán): ${deleteIds.length}`);

    // Delete in batches of 100
    for(let i=0; i<deleteIds.length; i+=100) {
        const batch = deleteIds.slice(i, i+100);
        const { error: delErr } = await supabase.from('porticos').delete().in('id', batch);
        if (delErr) {
            console.error("Error deleting batch:", delErr);
        } else {
            console.log(`Removed batch ${Math.floor(i/100)+1} of ${Math.ceil(deleteIds.length/100)}`);
        }
    }

    // 2. Parse GeoJSON features
    const parsedFeatures = [];
    for (const feature of features) {
        let name = feature.properties.name || feature.properties.official_name || "Sin Nombre";
        let ref = feature.properties.ref || null;
        let center = [0, 0];
        if (feature.geometry.type === 'Point') {
            center = feature.geometry.coordinates;
        } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
            center = getCentroid(feature.geometry.coordinates);
        }
        
        if (center[0] === 0 && center[1] === 0) continue;

        parsedFeatures.push({
            name, ref, lng: center[0], lat: center[1],
            matched: false,
            originalFeature: feature
        });
    }

    // 3. Match kept porticos to GeoJSON to prevent re-inserting them
    let exactMatchesFound = 0;
    for (const pk of keptPorticos) {
        // Find possible matches in GeoJSON (same ref, or same name)
        let candidates = parsedFeatures.filter(f => !f.matched && ((pk.reference_code && f.ref === pk.reference_code) || f.name === pk.name));
        
        if (candidates.length === 0) {
            // Unmapped. We just keep it.
            continue;
        }

        // Evaluate distance to find the real one (if directions are distinct)
        let closest = null;
        let minDistance = Infinity;

        for (const c of candidates) {
            const dist = getDistance(pk.latitude, pk.longitude, c.lat, c.lng);
            if (dist < minDistance) {
                minDistance = dist;
                closest = c;
            }
        }

        // if min distance < 2000 meters, we assume match
        if (closest && minDistance < 2000) {
            closest.matched = true;
            exactMatchesFound++;
            // Optionally update the pk coordinates to the closest feature exact coordinates
            await supabase.from('porticos').update({
                latitude: closest.lat,
                longitude: closest.lng,
                location: `SRID=4326;POINT(${closest.lng} ${closest.lat})`
            }).eq('id', pk.id);
        }
    }
    
    console.log(`- Coincidencias encontradas y marcadas (descartadas para inserción): ${exactMatchesFound}`);

    // 4. Insert all remaining unmatched features
    const toInsert = parsedFeatures.filter(f => !f.matched);
    console.log(`- Nuevos pórticos a insertar de GeoJSON: ${toInsert.length}`);

    let batchInsert = [];
    let insertedCount = 0;

    for (let i = 0; i < toInsert.length; i++) {
        const f = toInsert[i];
        
        batchInsert.push({
            name: f.name,
            reference_code: f.ref,
            latitude: f.lat,
            longitude: f.lng,
            location: `SRID=4326;POINT(${f.lng} ${f.lat})`,
            is_active: false
        });

        if (batchInsert.length === 50 || i === toInsert.length - 1) {
            const { error: insErr } = await supabase.from('porticos').insert(batchInsert);
            if (insErr) {
                console.error("Insert error:", insErr.message);
            } else {
                insertedCount += batchInsert.length;
            }
            batchInsert = [];
        }
    }

    console.log(`\n¡PROCESO FINALIZADO!`);
    console.log(`Pórticos con tarifa conservados: ${keptPorticos.length}`);
    console.log(`Pórticos eliminados: ${deleteIds.length}`);
    console.log(`Pórticos nuevos insertados: ${insertedCount}`);
}

run();
