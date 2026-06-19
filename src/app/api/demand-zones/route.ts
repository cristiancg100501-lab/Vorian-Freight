import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
    try {
        const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
        
        const { data: recentShipments, error } = await supabaseAdmin
            .from('shipments')
            .select('id, origin, pickup_latitude, pickup_longitude, createdAt')
            .gte('createdAt', threeHoursAgo);

        if (error) throw error;

        const features = (recentShipments || []).map((s: any) => {
            let lat = s.pickup_latitude;
            let lng = s.pickup_longitude;
            
            // Si usa el formato PostGIS POINT
            if (!lat && s.origin && s.origin.includes('POINT')) {
                const match = s.origin.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
                if (match) {
                    lng = parseFloat(match[1]);
                    lat = parseFloat(match[2]);
                }
            }
            
            if (!lat || !lng) return null;
            
            return {
                type: 'Feature',
                properties: {
                    id: s.id,
                    weight: 1 // Para el heatmap
                },
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat]
                }
            };
        }).filter(Boolean);

        const geojson = {
            type: 'FeatureCollection',
            features: features
        };

        return NextResponse.json(geojson);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
