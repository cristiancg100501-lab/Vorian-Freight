-- 🚀 VORIAN OFFICIAL AVO TARIFF LOADER
-- Valores transcritos exactamente del tarifario oficial (Área 1).

BEGIN;

-- 1. Limpieza de datos previos de AVO para asegurar integridad
DELETE FROM public.concession_matrices WHERE concession_name = 'AVO';

-- 2. Carga de datos exactos (18 tramos x 3 categorías = 54 filas)
INSERT INTO public.concession_matrices 
(concession_name, entry_portico_ref, exit_portico_ref, category, tbfp_price, tbp_price, distance_km, peak_windows, peak_days)
VALUES
-- P101 Bilbao -> P103 Los Militares
('AVO', 'P101 Bilbao', 'P103 Los Militares', 1, 545, 1090, 2.35, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P103 Los Militares', 2, 1090, 2181, 2.35, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P103 Los Militares', 3, 1635, 3271, 2.35, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P101 Bilbao -> P111 Cerro Colorado
('AVO', 'P101 Bilbao', 'P111 Cerro Colorado', 1, 644, 1287, 2.77, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P111 Cerro Colorado', 2, 1287, 2574, 2.77, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P111 Cerro Colorado', 3, 1931, 3862, 2.77, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P101 Bilbao -> P105 Salida Kennedy Oriente
('AVO', 'P101 Bilbao', 'P105 Salida Kennedy Oriente', 1, 900, 1799, 3.88, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P105 Salida Kennedy Oriente', 2, 1799, 3599, 3.88, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P105 Salida Kennedy Oriente', 3, 2699, 5398, 3.88, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P101 Bilbao -> P106 Salida Kennedy Poniente
('AVO', 'P101 Bilbao', 'P106 Salida Kennedy Poniente', 1, 841, 1682, 3.62, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P106 Salida Kennedy Poniente', 2, 1682, 3364, 3.62, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P106 Salida Kennedy Poniente', 3, 2523, 5046, 3.62, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P101 Bilbao -> P108 Costanera Norte - Nororiente
('AVO', 'P101 Bilbao', 'P108 Costanera Norte – Nororiente', 1, 983, 1966, 4.24, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P108 Costanera Norte – Nororiente', 2, 1966, 3932, 4.24, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P108 Costanera Norte – Nororiente', 3, 2949, 5898, 4.24, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P101 Bilbao -> P109 Pte. Centenario
('AVO', 'P101 Bilbao', 'P109 Pte. Centenario', 1, 1269, 2538, 5.47, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P109 Pte. Centenario', 2, 2538, 5077, 5.47, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P101 Bilbao', 'P109 Pte. Centenario', 3, 3808, 7615, 5.47, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P102 Martin de Zamora -> P103 Los Militares
('AVO', 'P102 Martin de Zamora', 'P103 Los Militares', 1, 254, 507, 1.09, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P103 Los Militares', 2, 507, 1015, 1.09, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P103 Los Militares', 3, 761, 1522, 1.09, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P102 Martin de Zamora -> P111 Cerro Colorado
('AVO', 'P102 Martin de Zamora', 'P111 Cerro Colorado', 1, 352, 704, 1.52, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P111 Cerro Colorado', 2, 704, 1409, 1.52, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P111 Cerro Colorado', 3, 1056, 2113, 1.52, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P102 Martin de Zamora -> P105 Salida Kennedy Oriente
('AVO', 'P102 Martin de Zamora', 'P105 Salida Kennedy Oriente', 1, 608, 1216, 2.62, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P105 Salida Kennedy Oriente', 2, 1216, 2433, 2.62, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P105 Salida Kennedy Oriente', 3, 1825, 3649, 2.62, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P102 Martin de Zamora -> P106 Salida Kennedy Poniente
('AVO', 'P102 Martin de Zamora', 'P106 Salida Kennedy Poniente', 1, 549, 1099, 2.37, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P106 Salida Kennedy Poniente', 2, 1099, 2198, 2.37, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P106 Salida Kennedy Poniente', 3, 1648, 3297, 2.37, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P102 Martin de Zamora -> P108 Costanera Norte – Nororiente
('AVO', 'P102 Martin de Zamora', 'P108 Costanera Norte – Nororiente', 1, 692, 1383, 2.98, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P108 Costanera Norte – Nororiente', 2, 1383, 2766, 2.98, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P108 Costanera Norte – Nororiente', 3, 2075, 4149, 2.98, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P102 Martin de Zamora -> P109 Pte. Centenario
('AVO', 'P102 Martin de Zamora', 'P109 Pte. Centenario', 1, 978, 1955, 4.21, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P109 Pte. Centenario', 2, 1955, 3911, 4.21, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P102 Martin de Zamora', 'P109 Pte. Centenario', 3, 2933, 5866, 4.21, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P104 Presidente Riesco -> P105 Salida Kennedy Oriente
('AVO', 'P104 Presidente Riesco', 'P105 Salida Kennedy Oriente', 1, 300, 601, 1.29, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P105 Salida Kennedy Oriente', 2, 601, 1201, 1.29, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P105 Salida Kennedy Oriente', 3, 901, 1802, 1.29, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P104 Presidente Riesco -> P106 Salida Kennedy Poniente
('AVO', 'P104 Presidente Riesco', 'P106 Salida Kennedy Poniente', 1, 242, 483, 1.04, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P106 Salida Kennedy Poniente', 2, 483, 967, 1.04, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P106 Salida Kennedy Poniente', 3, 725, 1450, 1.04, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P104 Presidente Riesco -> P108 Costanera Norte – Nororiente
('AVO', 'P104 Presidente Riesco', 'P108 Costanera Norte – Nororiente', 1, 384, 767, 1.65, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P108 Costanera Norte – Nororiente', 2, 767, 1535, 1.65, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P108 Costanera Norte – Nororiente', 3, 1151, 2302, 1.65, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P104 Presidente Riesco -> P109 Pte. Centenario
('AVO', 'P104 Presidente Riesco', 'P109 Pte. Centenario', 1, 670, 1340, 2.89, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P109 Pte. Centenario', 2, 1340, 2680, 2.89, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P104 Presidente Riesco', 'P109 Pte. Centenario', 3, 2010, 4019, 2.89, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P107 Kennedy-Vespucio -> P108 Costanera Norte – Nororiente
('AVO', 'P107 Kennedy-Vespucio', 'P108 Costanera Norte – Nororiente', 1, 374, 748, 1.61, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P107 Kennedy-Vespucio', 'P108 Costanera Norte – Nororiente', 2, 748, 1497, 1.61, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P107 Kennedy-Vespucio', 'P108 Costanera Norte – Nororiente', 3, 1122, 2245, 1.61, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),

-- P107 Kennedy-Vespucio -> P109 Pte. Centenario
('AVO', 'P107 Kennedy-Vespucio', 'P109 Pte. Centenario', 1, 660, 1321, 2.85, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P107 Kennedy-Vespucio', 'P109 Pte. Centenario', 2, 1321, 2641, 2.85, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]),
('AVO', 'P107 Kennedy-Vespucio', 'P109 Pte. Centenario', 3, 1981, 3962, 2.85, '[{"start":"07:30","end":"09:30"},{"start":"17:30","end":"19:30"}]', ARRAY[1,2,3,4,5]);

COMMIT;

-- ✅ LOG:
SELECT entry_portico_ref, exit_portico_ref, category, tbfp_price, tbp_price 
FROM public.concession_matrices 
WHERE concession_name = 'AVO' 
ORDER BY entry_portico_ref, category;
