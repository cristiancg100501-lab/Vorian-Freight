-- 🛠️ CALIBRACIÓN DE TARIFAS PARA CAMIONES PESADOS (RAMPLA)
-- Ajusta los valores en la base de datos para que una ruta Stgo -> San Antonio de ~450.000 CLP

UPDATE public."vehicleRates"
SET 
    "baseFare" = 150000,   -- Tarifa base por poner el camión a disposición
    "costPerKm" = 1200,    -- Costo por kilómetro (desgaste, neumáticos, mantenimiento)
    "fuelEfficiency" = 2.0 -- Rendimiento (Km por litro)
WHERE id IN ('rampla', 'camion_rampla', 'camion_pesado', 'semi_remolque');
