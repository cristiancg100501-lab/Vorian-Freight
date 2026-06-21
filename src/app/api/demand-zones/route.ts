import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { latLngToCell } from 'h3-js';
import { h3SetToFeatureCollection } from 'geojson2h3';

export async function GET() {
    try {
        const fortyFiveMinsAgo = new Date(Date.now() - 45 * 60 * 1000).toISOString();
        
        const { data: recentShipments, error } = await supabaseAdmin
            .from('shipments')
            .select('id, origin, pickup_latitude, pickup_longitude, createdAt')
            .gte('createdAt', fortyFiveMinsAgo);

        if (error) throw error;

        // Group by H3 index
        const h3Counts: Record<string, number> = {};

        (recentShipments || []).forEach((s: any) => {
            let lat = s.pickup_latitude;
            let lng = s.pickup_longitude;
            
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
                const hex = latLngToCell(lat, lng, 7);
                h3Counts[hex] = (h3Counts[hex] || 0) + 1;
            }
        });

        // Convert grouped H3 indices to GeoJSON polygons
        const hexes = Object.keys(h3Counts);
        const geojson = h3SetToFeatureCollection(hexes, (hex: string) => ({
            weight: h3Counts[hex],
            count: h3Counts[hex]
        }));

        return NextResponse.json(geojson);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
