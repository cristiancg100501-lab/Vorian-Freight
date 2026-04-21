#!/bin/bash

# Este script simula que Supabase Cloud está llamando a tu webhook local
# porque un chofer se movió a una nueva coordenada GPS.

# Configura estas variables
DRIVER_ID="INGRESA_UN_UID_DE_CHOFER_AQUI"
DRIVER_LAT=-33.45000 # Cambia a las coordenadas de la prueba
DRIVER_LNG=-70.66000

echo "Simulando actualización de GPS de chofer para evaluar Geocerca 300m..."
echo "Mandando a http://localhost:3000/api/webhooks/check-geofence"

curl -X POST http://localhost:3000/api/webhooks/check-geofence \
-H "Content-Type: application/json" \
-d "{
  \"type\": \"UPDATE\",
  \"table\": \"driverProfiles\",
  \"record\": {
    \"id\": \"${DRIVER_ID}\",
    \"currentLatitude\": ${DRIVER_LAT},
    \"currentLongitude\": ${DRIVER_LNG}
  }
}"

echo -e "\n\nListo. Revisa la respuesta del servidor arriba."
