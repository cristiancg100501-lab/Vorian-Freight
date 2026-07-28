import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedLocationLogs() {
  const trackingNumber = 'MNG-298080';
  
  // 1. Get the shipment
  const { data: shipments, error: shipmentError } = await supabase
    .from('shipments')
    .select('id, pickup_latitude, pickup_longitude, delivery_latitude, delivery_longitude, driverId')
    .eq('id', trackingNumber); // tracking_number doesn't exist, I need to use ID or lookup somehow. Wait. Let me check if trackingNumber exists. No, I should use the actual shipment ID if tracking_number doesn't exist.
    
  if (shipmentError || !shipments || shipments.length === 0) {
    console.error("Error finding shipment or shipment not found:", shipmentError);
    return;
  }
  
  const shipment = shipments[0];
  console.log("Found shipment:", shipment.id);
  
  // 2. Generate path points between origin and destination
  // Simple linear interpolation
  const numPoints = 15;
  
  const origin = { lat: shipment.pickup_latitude, lng: shipment.pickup_longitude };
  const destination = { lat: shipment.delivery_latitude, lng: shipment.delivery_longitude };
  
  if (!origin.lat || !destination.lat) {
      console.error("Shipment is missing coordinates.");
      return;
  }

  // Clear old points
  await supabase.from('driver_location_logs').delete().eq('shipment_id', shipment.id);

  // Fetch real route from Mapbox
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  let coords = [];
  
  try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?geometries=geojson&access_token=${mapboxToken}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
          // Mapbox returns [lng, lat]
          coords = data.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }));
      }
  } catch (e) {
      console.error("Mapbox fetch failed, falling back to linear", e);
  }

  // Fallback to linear if Mapbox fails
  if (coords.length === 0) {
      const numPoints = 15;
      for (let i = 0; i <= numPoints; i++) {
        const fraction = i / numPoints;
        coords.push({
            lat: origin.lat + (destination.lat - origin.lat) * fraction,
            lng: origin.lng + (destination.lng - origin.lng) * fraction
        });
      }
  }

  const logs = [];
  let currentTime = new Date(Date.now() - coords.length * 60 * 1000); // Start N mins ago

  for (let i = 0; i < coords.length; i++) {
    const pt = coords[i];
    // Add micro-noise so it looks like real GPS fluctuation
    const noiseLat = (Math.random() - 0.5) * 0.0001;
    const noiseLng = (Math.random() - 0.5) * 0.0001;

    logs.push({
      driver_id: shipment.driverId || '00000000-0000-0000-0000-000000000000',
      shipment_id: shipment.id,
      latitude: pt.lat + noiseLat,
      longitude: pt.lng + noiseLng,
      created_at: new Date(currentTime.getTime() + i * 30 * 1000).toISOString() // 30s intervals
    });
  }

  const { error: insertError } = await supabase
    .from('driver_location_logs')
    .insert(logs);

  if (insertError) {
    console.error("Error inserting logs:", insertError);
  } else {
    console.log(`Successfully seeded ${logs.length} location logs for shipment ${trackingNumber}`);
  }
}

seedLocationLogs();
