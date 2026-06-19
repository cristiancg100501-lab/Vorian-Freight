import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import * as fs from 'fs';
import * as path from 'path';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';

export async function GET() {
    try {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        
        const { data: recentShipments, error } = await supabaseAdmin
            .from('shipments')
            .select('id, origin, pickup_latitude, pickup_longitude, createdAt')
            .gte('createdAt', threeHoursAgo);

        if (error) throw error;

        const features: any[] = [];
        (recentShipments || []).forEach((s: any) => {
            let lat = s.pickup_latitude;
            let lng = s.pickup_longitude;
            
            // Parse WKB Hex (PostGIS default return format)
            if (!lat && s.origin && typeof s.origin === 'string') {
                if (s.origin.includes('POINT')) {
                    const match = s.origin.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
                    if (match) {
                        lng = parseFloat(match[1]);
                        lat = parseFloat(match[2]);
                    }
                } else if (s.origin.length >= 50 && s.origin.startsWith('0101000020')) {
                    try {
                        const buf = Buffer.from(s.origin.substring(18), 'hex');
                        lng = buf.readDoubleLE(0);
                        lat = buf.readDoubleLE(8);
                    } catch (e) {
                        console.warn('WKB parse error', e);
                    }
                }
            }
            
            if (lat && lng) {
                features.push({
                    type: 'Point',
                    coordinates: [lng, lat]
                });
            }
        });

        // Cargar geojson de comunas
        let comunasGeojson: any = { type: 'FeatureCollection', features: [] };
        try {
            const geojsonPath = path.join(process.cwd(), 'public', 'comunas.geojson');
            if (fs.existsSync(geojsonPath)) {
                comunasGeojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));
            } else {
                console.warn('comunas.geojson no encontrado');
            }
        } catch (e) {
            console.error('Error cargando comunas', e);
        }

        // Agrupar demanda por comuna
        const comunaDemand: Record<string, { feature: any, count: number }> = {};

        features.forEach((pt) => {
            for (const feature of comunasGeojson.features) {
                try {
                    if (booleanPointInPolygon(pt, feature)) {
                        const name = feature.properties.Comuna;
                        if (!comunaDemand[name]) {
                            comunaDemand[name] = { feature, count: 0 };
                        }
                        comunaDemand[name].count += 1;
                        break;
                    }
                } catch (e) {} // Ignorar poligonos invalidos
            }
        });

        // Crear GeoJSON de polígonos
        const responseFeatures = Object.values(comunaDemand).map(cd => ({
            ...cd.feature,
            properties: {
                ...cd.feature.properties,
                demandCount: cd.count
            }
        }));

        const geojson = {
            type: 'FeatureCollection',
            features: responseFeatures
        };

        return NextResponse.json(geojson);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
