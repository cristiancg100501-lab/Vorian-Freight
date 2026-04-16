export interface LocationHistoryPoint {
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number;
  heading: number;
}

// Generamos una ruta simulada en Santiago de Chile
export const MOCK_LOCATION_HISTORY: LocationHistoryPoint[] = [
  { latitude: -33.4372, longitude: -70.6506, timestamp: 1714564800000, speed: 0, heading: 90 }, // 08:00 AM
  { latitude: -33.4380, longitude: -70.6480, timestamp: 1714564860000, speed: 30, heading: 110 }, // 08:01 AM
  { latitude: -33.4400, longitude: -70.6450, timestamp: 1714564920000, speed: 45, heading: 120 }, // 08:02 AM
  { latitude: -33.4420, longitude: -70.6430, timestamp: 1714564980000, speed: 50, heading: 135 }, // 08:03 AM
  { latitude: -33.4445, longitude: -70.6405, timestamp: 1714565040000, speed: 20, heading: 135 }, // 08:04 AM (Traffic)
  { latitude: -33.4450, longitude: -70.6400, timestamp: 1714565100000, speed: 5, heading: 140 }, // 08:05 AM (Traffic)
  { latitude: -33.4475, longitude: -70.6380, timestamp: 1714565160000, speed: 40, heading: 135 }, // 08:06 AM
  { latitude: -33.4500, longitude: -70.6350, timestamp: 1714565220000, speed: 60, heading: 120 }, // 08:07 AM
  { latitude: -33.4525, longitude: -70.6330, timestamp: 1714565280000, speed: 55, heading: 110 }, // 08:08 AM
  { latitude: -33.4550, longitude: -70.6300, timestamp: 1714565340000, speed: 40, heading: 120 }, // 08:09 AM
  { latitude: -33.4560, longitude: -70.6270, timestamp: 1714565400000, speed: 25, heading: 90 }, // 08:10 AM
  { latitude: -33.4565, longitude: -70.6250, timestamp: 1714565460000, speed: 0, heading: 90 }, // 08:11 AM (Arrived)
];

// Opcional: Ruta planificada (para comparar si hubo desvío)
export const MOCK_PLANNED_ROUTE = [
  [-70.6506, -33.4372], // Inicio
  [-70.6450, -33.4400],
  [-70.6400, -33.4450],
  [-70.6350, -33.4500],
  [-70.6300, -33.4550],
  [-70.6250, -33.4565], // Fin
];
