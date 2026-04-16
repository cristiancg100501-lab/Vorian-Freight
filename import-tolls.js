const fs = require('fs');
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL);

async function importGeoJSON() {
  console.log('🚀 Iniciando importación de pórticos...');
  
  try {
    const rawData = fs.readFileSync('export.geojson', 'utf8');
    const geojson = JSON.parse(rawData);
    
    const features = geojson.features.filter(f => 
      f.properties.highway === 'toll_gantry' || 
      f.properties.barrier === 'toll_booth'
    );

    console.log(`📦 Encontrados ${features.length} puntos de interés.`);

    for (const feature of features) {
      const name = feature.properties.name || feature.properties.ref || 'Pórtico Desconocido';
      const ref = feature.properties.ref || null;
      const geom = JSON.stringify(feature.geometry);

      // Usamos PostGIS para insertar correctamente
      await sql`
        INSERT INTO public.porticos (name, location, reference_code)
        VALUES (
          ${name}, 
          ST_SetSRID(ST_GeomFromGeoJSON(${geom}), 4326)::geography, 
          ${ref}
        )
        ON CONFLICT (id) DO NOTHING;
      `;
    }

    console.log('✅ Importación completada con éxito.');
  } catch (error) {
    console.error('❌ Error durante la importación:', error);
  } finally {
    await sql.end();
  }
}

importGeoJSON();
