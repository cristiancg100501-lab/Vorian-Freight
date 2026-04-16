const fs = require('fs');

function run() {
    const geojsonData = JSON.parse(fs.readFileSync('./export.geojson', 'utf8'));
    const features = geojsonData.features;

    const refs = {};
    const names = {};

    features.forEach((feature, idx) => {
        let name = feature.properties.name || feature.properties.official_name || "Sin Nombre";
        let ref = feature.properties.ref || null;
        
        let center = [0, 0];
        if (feature.geometry.type === 'Point') {
            center = feature.geometry.coordinates;
        }

        if (ref) {
            if (!refs[ref]) refs[ref] = [];
            refs[ref].push({ name, coords: center, id: feature.properties['@id'] });
        } else if (name !== "Sin Nombre") {
            if (!names[name]) names[name] = [];
            names[name].push({ coords: center, id: feature.properties['@id'] });
        }
    });

    let duplicateRefs = Object.entries(refs).filter(([r, arr]) => arr.length > 1);
    console.log(`Duplicate Refs in GeoJSON: ${duplicateRefs.length}`);
    duplicateRefs.forEach(([r, arr]) => {
        console.log(`- REF: ${r} has ${arr.length} features`);
        arr.forEach(f => console.log(`   ${f.name} @ ${f.coords.join(',')}`));
    });

    let duplicateNames = Object.entries(names).filter(([n, arr]) => arr.length > 1);
    console.log(`\nDuplicate Names in GeoJSON: ${duplicateNames.length}`);
    duplicateNames.forEach(([n, arr]) => {
        console.log(`- NAME: ${n} has ${arr.length} features`);
        arr.forEach(f => console.log(`   @ ${f.coords.join(',')}`));
    });
}
run();
