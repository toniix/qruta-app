-- =============================================================================
-- RutaYa - Seed de datos de prueba (Lima + Ica + Huánuco + Chincha + Huancayo)
-- DESTRUYE TODO el contenido actual y lo reemplaza con datos reales de prueba.
--
-- Requiere: PostgreSQL con extensión PostGIS (Supabase ya la incluye).
-- Ejecutar MANUALMENTE en el SQL Editor de Supabase o con:
--   psql -h <HOST> -U postgres -d postgres -f seed_data.sql
--
-- NO se ejecuta automáticamente al arrancar el backend.
--
-- NOTA: la tabla `administrators` se limpia A PROPÓSITO. Después hay que crear
-- un admin a mano: el DataInitializer solo lo hace si `app.seed.enabled=true`
-- y `ADMIN_SEED_PASSWORD` tiene valor. El perfil `prod` desactiva el seed, y ya
-- no existe ninguna contraseña por defecto.
-- =============================================================================

BEGIN;

-- Extensión espacial (no-op si ya existe)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ---------------------------------------------------------------------------
-- 1) LIMPIEZA TOTAL
-- ---------------------------------------------------------------------------
TRUNCATE TABLE vehicle_locations, vehicles, route_points, route_stops,
              route_directions, routes, stops, transport_lines, cities,
              administrators
       RESTART IDENTITY CASCADE;

-- ===========================================================================
-- CIUDADES
-- ===========================================================================
INSERT INTO cities (id, name, department, country, latitude, longitude, radius_km, created_at, updated_at) VALUES
('10000000-0000-4000-8000-000000000001', 'Lima',    'Lima',     'Perú', -12.0463740, -77.0427930, 60.00, NOW(), NOW()),
('10000000-0000-4000-8000-000000000002', 'Ica',     'Ica',      'Perú', -14.0677700, -75.7286100, 30.00, NOW(), NOW()),
('10000000-0000-4000-8000-000000000003', 'Huánuco', 'Huánuco', 'Perú', -9.9300000, -76.2400000, 40.00, NOW(), NOW()),
('10000000-0000-4000-8000-000000000004', 'Chincha', 'Ica',      'Perú', -13.4172000, -76.1325000, 25.00, NOW(), NOW()),
('10000000-0000-4000-8000-000000000005', 'Huancayo', 'Junín',   'Perú', -12.0651000, -75.2049000, 30.00, NOW(), NOW());

-- ===========================================================================
-- LÍNEAS DE TRANSPORTE
-- ===========================================================================
INSERT INTO transport_lines (id, city_id, name, code, color, company, contact, description, status, created_at, updated_at) VALUES
('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Línea 1: Corredor Central Lima',   'L1',  '#2563eb', 'Consorcio Corredor Lima S.A.',      '+51 987 111 111', 'Eje Norte-Sur desde el Centro hasta Miraflores',           'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Línea 2: Expreso Sur Santiago',     'L2',  '#e11d48', 'Empresa TransMiraflores Perú S.A.C.','+51 987 222 222', 'Servicio expreso del Centro a Barranco',                   'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Línea 3: Vía Hospitales',           'L3',  '#16a34a', 'Urbano Salud Express S.A.',         '+51 987 333 333', 'Conecta hospitales del Centro con San Marcos',              'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Línea 4: Circuito Centro',          'L4',  '#0891b2', 'Circuito Central S.A.',             '+51 987 444 444', 'Circuito que une el Mercado Central y San Miguel',          'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Línea 5: Costa Sur',                'L5',  '#dc2626', 'Brisas del Pacífico S.A.C.',        '+51 987 555 555', 'Corredor perimetral de la Costa Verde',                     'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000002', 'Línea 1: Consorcio Urbano de Ica',  'L1',  '#2563eb', 'Consorcio Urbano Ica S.A.',         '+51 956 123 456', 'Conecta el centro con Huacachina',                         'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000002', 'Línea 9: Expreso Señor de Luren',   'L9',  '#9333ea', 'TransIca Sur S.A.C.',               '+51 956 789 012', 'Ruta transversal Norte-Sur de Ica',                        'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 'Línea 12: Interurbano Parcona',     'L12', '#0ea5e8', 'Transportes Integrados de Ica S.A.', '+51 956 333 444', 'Interurbana Parcona - UNICA',                             'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', 'Línea 22: Ruta Sol de Ica',         'L22', '#ca8a04', 'Empresa de Transportes El Sol S.A.', '+51 956 555 666', 'Rutas circulares de Ica',                                  'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', 'Línea 7: Corredor Norte',           'L7',  '#6366f1', 'Consorcio San Joaquín S.A.',        '+51 956 777 999', 'Conexión de Sanjoaquín con el norte',                      'ACTIVE', NOW(), NOW()),
-- Huánuco
('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000003', 'Línea 1: Expreso Centro Huánuco',   'H1',  '#2563eb', 'Transportes Huánuco Central S.A.',   '+51 962 111 222', 'Corredor principal del centro de Huánuco',                 'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000003', 'Línea 2: Circuito Universidad',     'H2',  '#e11d48', 'TransHuánuco Universitario S.A.C.',   '+51 962 333 444', 'Conecta la universidad con el centro',                      'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000003', 'Línea 3: Expreso Tingo María',      'H3',  '#16a34a', 'Expreso Tingo María S.A.',            '+51 962 555 666', 'Ruta rápida hacia el norte de Huánuco',                     'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000003', 'Línea 4: Circular Huánuco',         'H4',  '#9333ea', 'Circular Huánuco S.A.C.',              '+51 962 777 888', 'Circuito circular por los barrios principales',              'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000003', 'Línea 5: Interurbano Acomayo',      'H5',  '#ca8a04', 'Interurbano Acomayo S.A.',            '+51 962 999 000', 'Conexión interurbana con distritos aledaños',               'ACTIVE', NOW(), NOW()),
-- Chincha
('20000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000004', 'Línea 1: Consorcio Chinchano',       'CH1',  '#2563eb', 'Consorcio Chinchano S.A.',          '+51 956 111 222', 'Ruta troncal de Chincha Alta',                  'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000004', 'Línea 2: Expreso Grocio Prado',     'CH2',  '#e11d48', 'Trans Grocio Prado S.A.C.',          '+51 956 222 333', 'Conecta Chincha Alta con Grocio Prado',          'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000004', 'Línea 3: Brisas de Sunampe',        'CH3',  '#16a34a', 'Empresa Sunampe Express S.A.',       '+51 956 333 444', 'Conexión a Sunampe y Tambo de Mora',             'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000004', 'Línea 4: Interurbano Pueblo Nuevo',  'CH4',  '#ca8a04', 'Transportes Pueblo Nuevo S.A.',       '+51 956 444 555', 'Eje Pueblo Nuevo - Mercado Central',            'ACTIVE', NOW(), NOW()),
-- Huancayo
('20000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000005', 'Línea 1: Transportes San Carlos',    'HYO1', '#2563eb', 'Trans San Carlos S.A.',             '+51 964 111 222', 'Eje troncal Calle Real y El Tambo',              'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000005', 'Línea 2: Consorcio Wanka Express',   'HYO2', '#0891b2', 'Consorcio Wanka S.A.C.',             '+51 964 222 333', 'Conecta Chilca con El Tambo',                    'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000005', 'Línea 3: Trans Chupaca',             'HYO3', '#16a34a', 'Empresa Valle del Mantaro S.A.',     '+51 964 333 444', 'Ruta interurbana Huancayo - Chupaca',            'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000005', 'Línea 4: Expreso San Jerónimo',     'HYO4', '#9333ea', 'Trans San Jerónimo S.A.',           '+51 964 444 555', 'Conecta Huancayo con San Jerónimo de Tunán',     'ACTIVE', NOW(), NOW()),
('20000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000005', 'Línea 5: Circuito Universidad UNCP', 'HYO5', '#dc2626', 'Trans Universitaria Wanka S.A.',       '+51 964 555 666', 'Ruta universitaria hacia la UNCP',               'ACTIVE', NOW(), NOW());

-- ===========================================================================
-- PARADEROS (Lima: 14, Ica: 14, Huánuco: 12, Chincha: 10, Huancayo: 15 = 65 paraderos)
-- location = PostGIS point (longitud, latitud) en SR4326
-- ===========================================================================
INSERT INTO stops (id, city_id, name, location, reference, address, is_accessible, key_stop, created_at, updated_at) VALUES
-- Lima
('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Plaza de Armas de Lima',            ST_SetSRID(ST_MakePoint(-77.0305, -12.0449), 4326), 'Centro Histórico',          'Jr. Junín 100',                       true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Av. Abancay - Estación Central',    ST_SetSRID(ST_MakePoint(-77.0280, -12.0510), 4326), 'Cercado de Lima',           'Av. Abancay cdra 2',                  true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'Mercado Central de Lima',           ST_SetSRID(ST_MakePoint(-77.0255, -12.0449), 4326), 'Cercado de Lima',           'Jr. Vírgen del Puente',               true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'Parque Universitario',              ST_SetSRID(ST_MakePoint(-77.0315, -12.0553), 4326), 'Cercado de Lima',           'Avenida Abancá seg. 6',                true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'Hospital 2 de Mayo',                ST_SetSRID(ST_MakePoint(-77.0280, -12.0590), 4326), 'Cercado de Lima',           'Av. Grau 149',                        true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'Parque Kennedy - Miraflores',       ST_SetSRID(ST_MakePoint(-77.0305, -12.1222), 4326), 'Miraflores',                 'Av. Larco 988',                       true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'Óvalo de Miraflores',               ST_SetSRID(ST_MakePoint(-77.0297, -12.1210), 4326), 'Miraflores',                 'Av. Larco cdra 6',                    true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'Av. Benavides - Surquillo',         ST_SetSRID(ST_MakePoint(-77.0280, -12.1198), 4326), 'Surquillo',                  'Av. Benavides cdra 15',                 true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'Puente de los Suspiros - Barranco', ST_SetSRID(ST_MakePoint(-77.0265, -12.1461), 4326), 'Barranco',                   'Jr. San Ranoni 100',                  false, false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'Av. Grau (Cercado)',                ST_SetSRID(ST_MakePoint(-77.0340, -12.0650), 4326), 'Cercado de Lima',             'Av. Grau cdra 3',                    true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'Plaza San Miguel',                  ST_SetSRID(ST_MakePoint(-77.0728, -12.0751), 4326), 'San Miguel',                  'Av. La Marina',                       true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'Av. La Marina',                     ST_SetSRID(ST_MakePoint(-77.0680, -12.0720), 4326), 'San Miguel / Pueblo Libre',    'Av. La Marina cdra 8',               true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'Universidad de San Marcos',         ST_SetSRID(ST_MakePoint(-77.0845, -12.0589), 4326), 'San Marcos',                  'Av. Universitaria 400',               true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'Terminal de Yerbateros',            ST_SetSRID(ST_MakePoint(-77.0690, -12.1008), 4326), 'La Victoria',                 'Av. 28 de Julio 369',                 true,  false, NOW(), NOW()),
-- Ica
('30000000-0000-4000-8000-000000000015', '10000000-0000-4000-8000-000000000002', 'Plaza de Armas de Ica',             ST_SetSRID(ST_MakePoint(-75.7286, -14.0678), 4326), 'Ica Centro',                  'Av. Municipalidad cdra 1',             true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000016', '10000000-0000-4000-8000-000000000002', 'Santuario del Señor de Luren',      ST_SetSRID(ST_MakePoint(-75.7262, -14.0638), 4326), 'Ica',                         'Calle Ayacucho esq. Piura',            true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000017', '10000000-0000-4000-8000-000000000002', 'Mercado Modelo de Ica',             ST_SetSRID(ST_MakePoint(-75.7240, -14.0625), 4326), 'Ica',                         'Av. San Martín 850',                   true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000018', '10000000-0000-4000-8000-000000000002', 'Centro Comercial El Quinde',        ST_SetSRID(ST_MakePoint(-75.7380, -14.0715), 4326), 'Ica',                         'Av. Los Maestros 200',                 true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000019', '10000000-0000-4000-8000-000000000002', 'UNICA - Ciudad Universitaria',      ST_SetSRID(ST_MakePoint(-75.7330, -14.0750), 4326), 'Ica',                        'Av. Los Maestros / UNICA',              true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000020', '10000000-0000-4000-8000-000000000002', 'Hospital Regional de Ica',          ST_SetSRID(ST_MakePoint(-75.7210, -14.0790), 4326), 'Ica',                        'Av. J.J. Elias / Panamericana',         true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000002', 'Balneario Oasis de Huacachina',     ST_SetSRID(ST_MakePoint(-75.7626, -14.0875), 4326), 'Huacachina',                  'Malecón de Huacachina',                  false, true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000002', 'Óvalo Grau / Salida Sur',           ST_SetSRID(ST_MakePoint(-75.7305, -14.0580), 4326), 'Ica',                         'Av. Grau / Panamerican',                true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000002', 'Residencial San Joaquín',           ST_SetSRID(ST_MakePoint(-75.7390, -14.0530), 4326), 'San Joaquín',                 'Av. San Joaquín cdra 4',                true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000002', 'Plaza de Armas de Parcona',         ST_SetSRID(ST_MakePoint(-75.7050, -14.0480), 4326), 'Parcona',                      'Av. Pachacútec',                        true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000025', '10000000-0000-4000-8000-000000000002', 'Plaza de Armas de La Tinguiña',     ST_SetSRID(ST_MakePoint(-75.7180, -14.0324), 4326), 'La Tinguiña',                 'Av. Las Nieves',                        true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000026', '10000000-0000-4000-8000-000000000002', 'Pueblito de Cachiche',              ST_SetSRID(ST_MakePoint(-75.7150, -14.0820), 4326), 'Cachiche',                     'Av. Fernando León de Vivero',           true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000027', '10000000-0000-4000-8000-000000000002', 'Entrada a Subtanjalla',             ST_SetSRID(ST_MakePoint(-75.7480, -14.0210), 4326), 'Subtanjalla',                  'Panamericana Norte Km 295',             false, false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000028', '10000000-0000-4000-8000-000000000002', 'Terminal Terrestre de Ica',         ST_SetSRID(ST_MakePoint(-75.7340, -14.0660), 4326), 'Ica',                            'Av. Fermín Tangüis 120',                true,  false, NOW(), NOW()),
-- Huánuco
('30000000-0000-4000-8000-000000000029', '10000000-0000-4000-8000-000000000003', 'Plaza de Armas de Huánuco',         ST_SetSRID(ST_MakePoint(-76.2400, -9.9300), 4326), 'Huánuco Centro',             'Jr. 2 de Mayo 500',                     true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000030', '10000000-0000-4000-8000-000000000003', 'Mercado Central de Huánuco',         ST_SetSRID(ST_MakePoint(-76.2380, -9.9280), 4326), 'Huánuco',                     'Av. General Prado 800',                 true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000003', 'UNAH - Universidad Nacional',        ST_SetSRID(ST_MakePoint(-76.2450, -9.9250), 4326), 'Huánuco',                     'Av. Universitaria Km 1.5',             true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000003', 'Hospital Regional Hermilio Valdizán', ST_SetSRID(ST_MakePoint(-76.2350, -9.9320), 4326), 'Huánuco',                     'Av. Daniel A. Carrión 200',             true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000003', 'Estadio Municipal de Huánuco',      ST_SetSRID(ST_MakePoint(-76.2420, -9.9350), 4326), 'Huánuco',                     'Av. Huallaga 300',                     true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000034', '10000000-0000-4000-8000-000000000003', 'Jr. Huallaga - Centro',             ST_SetSRID(ST_MakePoint(-76.2390, -9.9290), 4326), 'Huánuco',                     'Jr. Huallaga 400',                      true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000035', '10000000-0000-4000-8000-000000000003', 'Av. Tingo María Norte',            ST_SetSRID(ST_MakePoint(-76.2500, -9.9200), 4326), 'Huánuco',                     'Av. Tingo María 150',                   true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000036', '10000000-0000-4000-8000-000000000003', 'Terminal Terrestre de Huánuco',      ST_SetSRID(ST_MakePoint(-76.2360, -9.9400), 4326), 'Huánuco',                     'Av. Terminal s/n',                      true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000037', '10000000-0000-4000-8000-000000000003', 'San Francisco de Asís',             ST_SetSRID(ST_MakePoint(-76.2430, -9.9310), 4326), 'Huánuco',                     'Jr. San Francisco 200',                 true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000038', '10000000-0000-4000-8000-000000000003', 'Centro C comercial Mega Plaza',      ST_SetSRID(ST_MakePoint(-76.2470, -9.9260), 4326), 'Huánuco',                     'Av. Mega Plaza 100',                    true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000039', '10000000-0000-4000-8000-000000000003', 'Barrio de Acomayo',                 ST_SetSRID(ST_MakePoint(-76.2550, -9.9150), 4326), 'Acomayo',                     'Jr. Acomayo s/n',                       true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000040', '10000000-0000-4000-8000-000000000003', 'Puente Huallaga',                   ST_SetSRID(ST_MakePoint(-76.2410, -9.9380), 4326), 'Huánuco',                     'Puente Huallaga s/n',                   true,  false, NOW(), NOW()),
-- Chincha
('30000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000004', 'Plaza de Armas de Chincha',          ST_SetSRID(ST_MakePoint(-76.1325, -13.4172), 4326), 'Chincha Centro',               'Calle Mariscal Castilla 100',          true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000042', '10000000-0000-4000-8000-000000000004', 'Mercado Modelo de Chincha',          ST_SetSRID(ST_MakePoint(-76.1310, -13.4150), 4326), 'Chincha',                      'Av. Benavides 350',                    true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000043', '10000000-0000-4000-8000-000000000004', 'Plaza de Armas de Grocio Prado',      ST_SetSRID(ST_MakePoint(-76.1550, -13.4000), 4326), 'Grocio Prado',                  'Av. Centenario 200',                   true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000044', '10000000-0000-4000-8000-000000000004', 'Santuario Melchorita',               ST_SetSRID(ST_MakePoint(-76.1580, -13.3980), 4326), 'Grocio Prado',                  'Calle Melchorita s/n',                 true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000045', '10000000-0000-4000-8000-000000000004', 'Plaza de Armas de Sunampe',           ST_SetSRID(ST_MakePoint(-76.1520, -13.4280), 4326), 'Sunampe',                       'Av. 28 de Julio 150',                  true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000046', '10000000-0000-4000-8000-000000000004', 'Puerto de Tambo de Mora',             ST_SetSRID(ST_MakePoint(-76.1830, -13.4650), 4326), 'Tambo de Mora',                 'Malecón de Tambo de Mora',             false, true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000047', '10000000-0000-4000-8000-000000000004', 'Plaza Principal de Pueblo Nuevo',    ST_SetSRID(ST_MakePoint(-76.1260, -13.3980), 4326), 'Pueblo Nuevo',                  'Av. 2 de Mayo 400',                    true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000048', '10000000-0000-4000-8000-000000000004', 'Terminal Terrestre de Chincha',      ST_SetSRID(ST_MakePoint(-76.1380, -13.4250), 4326), 'Chincha Alta',                  'Panamericana Sur Km 201',              true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000049', '10000000-0000-4000-8000-000000000004', 'Hospital San José de Chincha',       ST_SetSRID(ST_MakePoint(-76.1350, -13.4210), 4326), 'Chincha Alta',                  'Av. Los Próceres 120',                 true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000050', '10000000-0000-4000-8000-000000000004', 'Óvalo de Chincha - Panamericana Sur',ST_SetSRID(ST_MakePoint(-76.1400, -13.4300), 4326), 'Chincha Alta',                  'Óvalo Panamericana / Cruce Sunampe',   true,  false, NOW(), NOW()),
-- Huancayo
('30000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000005', 'Plaza Huamanmarca',                   ST_SetSRID(ST_MakePoint(-75.2049, -12.0651), 4326), 'Huancayo Centro',               'Paseo La Breña / Calle Real',          true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000052', '10000000-0000-4000-8000-000000000005', 'Plaza Constitución',                  ST_SetSRID(ST_MakePoint(-75.2070, -12.0680), 4326), 'Huancayo Centro',               'Calle Real cdra 5',                    true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000053', '10000000-0000-4000-8000-000000000005', 'Mercado Mayorista de Huancayo',        ST_SetSRID(ST_MakePoint(-75.2120, -12.0720), 4326), 'Huancayo',                      'Jr. Calixto / Jr. Mantaro',            true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000054', '10000000-0000-4000-8000-000000000005', 'Estación del Ferrocarril Central',   ST_SetSRID(ST_MakePoint(-75.2055, -12.0640), 4326), 'Huancayo',                      'Av. Ferrocarril 600',                  true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000055', '10000000-0000-4000-8000-000000000005', 'Parque Bolognesi - El Tambo',         ST_SetSRID(ST_MakePoint(-75.2200, -12.0480), 4326), 'El Tambo',                      'Av. Mariscal Castilla cdra 12',        true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000056', '10000000-0000-4000-8000-000000000005', 'Ciudad Universitaria UNCP',           ST_SetSRID(ST_MakePoint(-75.2350, -12.0300), 4326), 'El Tambo',                      'Av. Mariscal Castilla 3909',           true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000057', '10000000-0000-4000-8000-000000000005', 'Plaza Principal de Chilca',           ST_SetSRID(ST_MakePoint(-75.1980, -12.0820), 4326), 'Chilca',                         'Av. 9 de Diciembre 250',               true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000058', '10000000-0000-4000-8000-000000000005', 'Mercado de Chilca',                  ST_SetSRID(ST_MakePoint(-75.2010, -12.0800), 4326), 'Chilca',                         'Jr. Arterial / Av. Real',              true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000059', '10000000-0000-4000-8000-000000000005', 'Terminal Terrestre Los Andes',        ST_SetSRID(ST_MakePoint(-75.2160, -12.0520), 4326), 'El Tambo',                      'Av. Evitamiento 450',                  true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000060', '10000000-0000-4000-8000-000000000005', 'Hospital Regional Carrión',            ST_SetSRID(ST_MakePoint(-75.2030, -12.0610), 4326), 'Huancayo',                      'Av. Daniel A. Carrión s/n',            true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000061', '10000000-0000-4000-8000-000000000005', 'Hospital Materno Infantil El Carmen',  ST_SetSRID(ST_MakePoint(-75.2090, -12.0690), 4326), 'Huancayo',                      'Jr. Puno 350',                         true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000062', '10000000-0000-4000-8000-000000000005', 'Plaza Principal de San Jerónimo',     ST_SetSRID(ST_MakePoint(-75.2850, -11.9560), 4326), 'San Jerónimo',                  'Plaza Principal s/n',                  true,  true,  NOW(), NOW()),
('30000000-0000-4000-8000-000000000063', '10000000-0000-4000-8000-000000000005', 'Parque de la Identidad Huanca',        ST_SetSRID(ST_MakePoint(-75.2150, -12.0450), 4326), 'San Antonio / Huancayo',        'Jr. San Martín esq. Huallaga',         true,  false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000064', '10000000-0000-4000-8000-000000000005', 'Puente Chupaca',                      ST_SetSRID(ST_MakePoint(-75.2800, -12.0600), 4326), 'Chupaca',                        'Av. Los Héroes s/n',                   false, false, NOW(), NOW()),
('30000000-0000-4000-8000-000000000065', '10000000-0000-4000-8000-000000000005', 'Plaza Independencia de Chupaca',       ST_SetSRID(ST_MakePoint(-75.2880, -12.0630), 4326), 'Chupaca',                        'Jr. Grau / Jr. Bruno Terreros',         true,  true,  NOW(), NOW());

-- ===========================================================================
-- RUTAS (42 rutas: 7 en Lima, 10 en Ica, 10 en Huánuco, 5 en Chincha, 10 en Huancayo)
-- con todas ellas se cumple "≥3 paraderos por dirección"
-- códigos de ruta únicos (routes.code = UNIQUE), popularityScore variado
-- ===========================================================================
INSERT INTO routes (id, transport_line_id, code, name, category, color, description, fare, schedule, frequency, popularity_score, status, created_at, updated_at) VALUES
-- Lima
('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'LIMA-01', 'Plaza de Armas – Miraflores (Parque Kennedy)', 'MICRO', '#2563eb', 'Eje turístico del Centro hacia Miraflores',        'S/ 2.50', '06:00 - 22:00', 'Cada 8 min', 95,  'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'LIMA-02', 'Yerbateros – Centro – San Marcos',              'MICRO', '#60a5fa', 'Conecta el terminal con la universidad',             'S/ 2.00', '05:30 - 21:30', 'Cada 10 min', 88, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'LIMA-03', 'Expreso Sur – Barranco',                          'COMBI', '#e11d48', 'Ruta rápida expresa del Centro a Barranco',        'S/ 3.00', '06:00 - 23:00', 'Cada 12 min', 90, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000003', 'LIMA-04', 'Centro – Hospital 2 de Mayo',                      'MICRO', '#16a34a', 'Servicio corto a los hospitales',                   'S/ 1.50', '06:30 - 20:00', 'Cada 15 min', 62, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000004', 'LIMA-05', 'Mercado Central – San Miguel',                     'COMBI', '#0891b2', 'Ratón + circuito comercial al oeste',               'S/ 2.00', '06:00 - 21:00', 'Cada 9 min',  70, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000005', 'LIMA-06', 'Av. Grau – Costa Sur (Barranco)',                 'MICRO', '#dc2626', 'Perimetral por Av. Grau hacia la Costa Verde',      'S/ 2.80', '06:00 - 23:00', 'Cada 10 min', 82, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000005', 'LIMA-07', 'Circuito Miraflores – Barranco',                 'COMBI', '#f43f5e', 'Circuito de los balnearios por la Costa',          'S/ 2.00', '06:00 - 22:30', 'Cada 9 min',   77, 'ACTIVE', NOW(), NOW()),
-- Ica
('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000006', 'ICA-01',  'Plaza de Armas – Huacachina',                    'MICRO', '#2563eb', 'Llegar a la laguna desde el centro',               'S/ 2.00', '06:00 - 21:00', 'Cada 10 min', 95,  'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000007', 'ICA-02',  'Mercado Modelo – UNICA',                         'MICRO', '#9333ea', 'Ruta universitaria con parada en el santuario',    'S/ 2.20', '05:30 - 21:30', 'Cada 7 min',  88, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000007', 'ICA-03',  'Óvalo Grau – Santuario Luren (Gira comercial)',   'COMBI', '#6d28d9', 'Circuito comercial que atraviesa el centro',       'S/ 2.20', '06:00 - 22:00', 'Cada 8 min',  82, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000008', 'ICA-04',  'Ica – Parcona – La Tinguiña',                     'COMBI', '#0ea5e8', 'Interurbana a los distritos del norte',            'S/ 2.50', '06:00 - 20:00', 'Cada 15 min', 64, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000009', 'ICA-05',  'Terminal Terrestre – Subtanjalla',                'MICRO', '#ca8a04', 'Conexión hacia el norte de Ica',                   'S/ 2.80', '05:00 - 21:00', 'Cada 12 min', 60, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000010', 'ICA-06',  'Parcona – UNICA – El Quinde',                    'COMBI', '#6366f1', 'Interurbano con paradas claves',                   'S/ 2.30', '06:00 - 21:30', 'Cada 9 min',   75, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000024', '20000000-0000-4000-8000-000000000006', 'ICA-07',  'Centro – Cachiche – Subtanjalla',                'COMBI', '#059669', 'Ruta turística por el norte de Ica',               'S/ 2.50', '06:30 - 20:30', 'Cada 12 min', 70, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000025', '20000000-0000-4000-8000-000000000009', 'ICA-08',  'El Quinde – San Joaquín – Santuario',             'MICRO', '#7c3aed', 'Ruta comercial del sur de Ica',                    'S/ 2.00', '06:00 - 22:00', 'Cada 10 min', 68, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000026', '20000000-0000-4000-8000-000000000007', 'ICA-09',  'UNICA – Parcona – Terminal Terrestre',            'COMBI', '#db2777', 'Conexión universitaria con terminal',               'S/ 2.80', '05:30 - 21:00', 'Cada 11 min', 62, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000027', '20000000-0000-4000-8000-000000000008', 'ICA-10',  'Huacachina – La Tinguiña – Centro',                'MICRO', '#ea580c', 'Ruta circular por el este de Ica',                 'S/ 2.20', '06:00 - 21:30', 'Cada 9 min',  80, 'ACTIVE', NOW(), NOW()),
-- Huánuco
('40000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000011', 'HUAN-01', 'Plaza de Armas – UNAH',                         'MICRO', '#2563eb', 'Corredor principal hacia la universidad',            'S/ 1.50', '06:00 - 22:00', 'Cada 8 min',  92, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000011', 'HUAN-02', 'Mercado Central – Hospital Regional',             'MICRO', '#60a5fa', 'Conexión comercial con el hospital',                'S/ 1.20', '06:30 - 21:00', 'Cada 7 min',  85, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000012', 'HUAN-03', 'UNAH – Centro – Estadio Municipal',              'COMBI', '#e11d48', 'Circuito universitario por el centro',               'S/ 1.50', '05:30 - 21:30', 'Cada 9 min',  88, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000012', 'HUAN-04', 'Plaza de Armas – Jr. Huallaga',                   'MICRO', '#f43f5e', 'Recorrido céntrico por Jr. Huallaga',                'S/ 1.00', '06:00 - 20:00', 'Cada 10 min', 75, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000013', 'HUAN-05', 'Terminal Terrestre – Tingo María Norte',        'COMBI', '#16a34a', 'Expreso hacia el norte de Huánuco',                 'S/ 2.00', '05:00 - 22:00', 'Cada 12 min', 78, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000019', '20000000-0000-4000-8000-000000000013', 'HUAN-06', 'Centro – Estadio – UNAH',                        'MICRO', '#84cc16', 'Conexión deportiva con universidad',                 'S/ 1.50', '06:30 - 21:00', 'Cada 8 min',  82, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000020', '20000000-0000-4000-8000-000000000014', 'HUAN-07', 'Circuito Mega Plaza – San Francisco',             'COMBI', '#9333ea', 'Circuito comercial y residencial',                   'S/ 1.20', '06:00 - 21:30', 'Cada 9 min',  70, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000021', '20000000-0000-4000-8000-000000000014', 'HUAN-08', 'Centro – Hospital – Mega Plaza',                  'MICRO', '#a855f7', 'Conexión hospitalaria con zona comercial',            'S/ 1.50', '06:00 - 20:30', 'Cada 10 min', 65, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000022', '20000000-0000-4000-8000-000000000015', 'HUAN-09', 'Terminal – Acomayo – Centro',                     'COMBI', '#ca8a04', 'Ruta interurbana hacia Acomayo',                    'S/ 2.50', '05:30 - 21:00', 'Cada 15 min', 60, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000023', '20000000-0000-4000-8000-000000000015', 'HUAN-10', 'Puente Huallaga – Plaza de Armas – UNAH',        'MICRO', '#f59e0b', 'Ruta completa por los principales puntos',          'S/ 1.80', '06:00 - 22:30', 'Cada 11 min', 85, 'ACTIVE', NOW(), NOW()),
-- Chincha (5 rutas)
('40000000-0000-4000-8000-000000000028', '20000000-0000-4000-8000-000000000016', 'CHIN-01', 'Plaza de Armas – Mercado – Terminal Terrestre', 'MICRO', '#2563eb', 'Ruta troncal principal de Chincha Alta',              'S/ 1.50', '06:00 - 22:00', 'Cada 8 min',  92, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000029', '20000000-0000-4000-8000-000000000017', 'CHIN-02', 'Chincha Centro – Grocio Prado – Melchorita',    'COMBI', '#e11d48', 'Conecta Chincha con el santuario de Grocio Prado',   'S/ 1.80', '05:30 - 21:30', 'Cada 6 min',  95, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000030', '20000000-0000-4000-8000-000000000018', 'CHIN-03', 'Mercado Modelo – Sunampe – Tambo de Mora',      'COMBI', '#16a34a', 'Ruta comercial y costera hacia Tambo de Mora',       'S/ 2.00', '06:00 - 21:00', 'Cada 10 min', 84, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000031', '20000000-0000-4000-8000-000000000019', 'CHIN-04', 'Pueblo Nuevo – Plaza de Armas – Hospital',       'MICRO', '#ca8a04', 'Eje Pueblo Nuevo con centro y hospital San José',    'S/ 1.50', '05:45 - 22:00', 'Cada 7 min',  80, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000032', '20000000-0000-4000-8000-000000000016', 'CHIN-05', 'Óvalo Panamericana – Plaza – Sunampe',           'COMBI', '#0891b2', 'Conexión sur-centro con el distrito de Sunampe',     'S/ 1.80', '06:00 - 21:30', 'Cada 9 min',  78, 'ACTIVE', NOW(), NOW()),
-- Huancayo (10 rutas)
('40000000-0000-4000-8000-000000000033', '20000000-0000-4000-8000-000000000020', 'HYO-01',  'Chilca – Huancayo Centro – El Tambo',             'MICRO', '#2563eb', 'Eje troncal principal Calle Real y Av. Mariscal Castilla', 'S/ 1.50', '05:30 - 22:30', 'Cada 5 min',  98, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000034', '20000000-0000-4000-8000-000000000024', 'HYO-02',  'Plaza Huamanmarca – El Tambo – UNCP',             'MICRO', '#dc2626', 'Corredor universitario central hacia la UNCP',        'S/ 1.50', '06:00 - 22:00', 'Cada 6 min',  96, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000035', '20000000-0000-4000-8000-000000000021', 'HYO-03',  'Terminal Los Andes – Calle Real – Chilca',        'COMBI', '#0891b2', 'Ruta rápida desde terminal norte hasta Chilca',      'S/ 1.80', '05:30 - 22:00', 'Cada 7 min',  89, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000036', '20000000-0000-4000-8000-000000000022', 'HYO-04',  'Huancayo Centro – Puente Chupaca – Chupaca',       'MICRO', '#16a34a', 'Interurbano Valle del Mantaro hacia Chupaca',        'S/ 2.50', '05:00 - 21:30', 'Cada 10 min', 91, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000037', '20000000-0000-4000-8000-000000000023', 'HYO-05',  'Plaza Constitución – El Tambo – San Jerónimo',    'COMBI', '#9333ea', 'Conecta el centro con San Jerónimo de Tunán',        'S/ 2.20', '05:30 - 21:00', 'Cada 8 min',  87, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000038', '20000000-0000-4000-8000-000000000020', 'HYO-06',  'Hospital Carrión – Mayorista – Parque Identidad', 'MICRO', '#60a5fa', 'Circuito de salud y zonas turísticas de San Antonio', 'S/ 1.50', '06:00 - 21:00', 'Cada 8 min',  82, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000039', '20000000-0000-4000-8000-000000000021', 'HYO-07',  'Chilca – Hospital El Carmen – Parque Bolognesi',  'COMBI', '#0284c7', 'Conexión Chilca y hospital materno infantil',         'S/ 1.50', '06:00 - 21:30', 'Cada 9 min',  79, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000040', '20000000-0000-4000-8000-000000000024', 'HYO-08',  'Terminal Los Andes – Hospital El Carmen – UNCP',   'MICRO', '#e11d48', 'Conecta terminal terrestre con El Tambo y la UNCP',   'S/ 1.80', '06:00 - 22:00', 'Cada 8 min',  85, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000041', '20000000-0000-4000-8000-000000000022', 'HYO-09',  'Mercado Mayorista – Puente Chupaca – Chupaca',    'COMBI', '#15803d', 'Ruta comercial y rural hacia Chupaca',               'S/ 2.50', '05:30 - 21:00', 'Cada 12 min', 76, 'ACTIVE', NOW(), NOW()),
('40000000-0000-4000-8000-000000000042', '20000000-0000-4000-8000-000000000023', 'HYO-10',  'Huamanmarca – Parque Identidad – San Jerónimo',   'MICRO', '#7c3aed', 'Ruta panorámica de Huancayo a San Jerónimo',         'S/ 2.20', '06:00 - 21:30', 'Cada 10 min', 81, 'ACTIVE', NOW(), NOW());

-- ===========================================================================
-- DIRECCIONES DE RUTA (42 rutas × 2 = 84 direcciones)
-- OUTBOUND = ida, INBOUND = vuelta (cada una con origen/destino y tramo propio)
-- ===========================================================================
INSERT INTO route_directions (id, route_id, direction, origin_name, destination_name, total_distance_km, estimated_minutes, created_at, updated_at) VALUES
-- LIMA-01
('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'OUTBOUND', 'Plaza de Armas de Lima', 'Parque Kennedy', 12.5, 45, NOW(), NOW()),
('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'INBOUND',  'Parque Kennedy',       'Plaza de Armas', 13.1, 47, NOW(), NOW()),
-- LIMA-02
('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002', 'OUTBOUND', 'Terminal Yerbateros',  'Univ. San Marcos', 10.8, 40, NOW(), NOW()),
('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002', 'INBOUND',  'Univ. San Marcos',    'Terminal Yerbateros', 10.9, 40, NOW(), NOW()),
-- LIMA-03
('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000003', 'OUTBOUND', 'Estación Central',     'Puente de los Suspiros', 14.0, 52, NOW(), NOW()),
('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000003', 'INBOUND',  'Puente de los Suspiros', 'Estación Central', 14.5, 53, NOW(), NOW()),
-- LIMA-04
('50000000-0000-4000-8000-000000000007', '40000000-0000-4000-8000-000000000004', 'OUTBOUND', 'Plaza de Armas',      'Hospital 2 de Mayo', 3.8, 15, NOW(), NOW()),
('50000000-0000-4000-8000-000000000008', '40000000-0000-4000-8000-000000000004', 'INBOUND',  'Hospital 2 Mayo',     'Plaza de Armas', 3.9, 15, NOW(), NOW()),
-- LIMA-05
('50000000-0000-4000-8000-000000000009', '40000000-0000-4000-8000-000000000005', 'OUTBOUND', 'Mercado Central',     'Plaza San Miguel', 11.0, 38, NOW(), NOW()),
('50000000-0000-4000-8000-000000000010', '40000000-0000-4000-8000-000000000005', 'INBOUND',  'Plaza San Miguel',    'Mercado Central', 11.2, 39, NOW(), NOW()),
-- LIMA-06
('50000000-0000-4000-8000-000000000011', '40000000-0000-4000-8000-000000000006', 'OUTBOUND', 'Av. Grau',             'Puente de los Suspiros', 13.4, 48, NOW(), NOW()),
('50000000-0000-4000-8000-000000000012', '40000000-0000-4000-8000-000000000006', 'INBOUND',  'Puente de los Suspiros', 'Av. Grau', 13.6, 48, NOW(), NOW()),
-- LIMA-07
('50000000-0000-4000-8000-000000000013', '40000000-0000-4000-8000-000000000007', 'OUTBOUND', 'Óvalo de Miraflores', 'Puente de los Suspiros', 7.7, 28, NOW(), NOW()),
('50000000-0000-4000-8000-000000000014', '40000000-0000-4000-8000-000000000007', 'INBOUND', 'Puente de los Suspiros', 'Óvalo de Miraflores', 7.8, 28, NOW(), NOW()),
-- ICA-01
('50000000-0000-4000-8000-000000000015', '40000000-0000-4000-8000-000000000008', 'OUTBOUND', 'Plaza de Armas de Ica', 'Huacachina', 8.6, 25, NOW(), NOW()),
('50000000-0000-4000-8000-000000000016', '40000000-0000-4000-8000-000000000008', 'INBOUND',  'Huacachina',           'Plaza de Armas de Ica', 8.8, 26, NOW(), NOW()),
-- ICA-02
('50000000-0000-4000-8000-000000000017', '40000000-0000-4000-8000-000000000009', 'OUTBOUND', 'Mercado Modelo',       'UNICA', 6.2, 20, NOW(), NOW()),
('50000000-0000-4000-8000-000000000018', '40000000-0000-4000-8000-000000000009', 'INBOUND',  'UNICA',                'Mercado Modelo', 6.3, 20, NOW(), NOW()),
-- ICA-03
('50000000-0000-4000-8000-000000000019', '40000000-0000-4000-8000-000000000010', 'OUTBOUND', 'Óvalo Grau',           'Santuario de Luren', 7.5, 26, NOW(), NOW()),
('50000000-0000-4000-8000-000000000020', '40000000-0000-4000-8000-000000000010', 'INBOUND',  'Santuario de Luren',   'Óvalo Grau', 7.6, 26, NOW(), NOW()),
-- ICA-04
('50000000-0000-4000-8000-000000000021', '40000000-0000-4000-8000-000000000011', 'OUTBOUND', 'Plaza de Armas de Ica',  'La Tinguiña', 9.4, 32, NOW(), NOW()),
('50000000-0000-4000-8000-000000000022', '40000000-0000-4000-8000-000000000011', 'INBOUND',  'La Tinguiña',          'Plaza de Armas de Ica', 9.5, 32, NOW(), NOW()),
-- ICA-05
('50000000-0000-4000-8000-000000000023', '40000000-0000-4000-8000-000000000012', 'OUTBOUND', 'Terminal Terrestre',   'Subtanjalla', 6.0, 18, NOW(), NOW()),
('50000000-0000-4000-8000-000000000024', '40000000-0000-4000-8000-000000000012', 'INBOUND',  'Subtanjilla',          'Terminal Terrestre', 6.0, 18, NOW(), NOW()),
-- ICA-06
('50000000-0000-4000-8000-000000000025', '40000000-0000-4000-8000-000000000013', 'OUTBOUND', 'Parcona',               'El Quinde', 7.1, 24, NOW(), NOW()),
('50000000-0000-4000-8000-000000000026', '40000000-0000-4000-8000-000000000013', 'INBOUND',  'El Quinde',             'Parcona', 7.3, 25, NOW(), NOW()),
-- ICA-07
('50000000-0000-4000-8000-000000000047', '40000000-0000-4000-8000-000000000024', 'OUTBOUND', 'Plaza de Armas de Ica', 'Subtanjalla', 9.0, 30, NOW(), NOW()),
('50000000-0000-4000-8000-000000000048', '40000000-0000-4000-8000-000000000024', 'INBOUND',  'Subtanjalla', 'Plaza de Armas de Ica', 9.2, 31, NOW(), NOW()),
-- ICA-08
('50000000-0000-4000-8000-000000000049', '40000000-0000-4000-8000-000000000025', 'OUTBOUND', 'El Quinde', 'Santuario de Luren', 7.8, 26, NOW(), NOW()),
('50000000-0000-4000-8000-000000000050', '40000000-0000-4000-8000-000000000025', 'INBOUND',  'Santuario de Luren', 'El Quinde', 8.0, 27, NOW(), NOW()),
-- ICA-09
('50000000-0000-4000-8000-000000000051', '40000000-0000-4000-8000-000000000026', 'OUTBOUND', 'UNICA', 'Terminal Terrestre de Ica', 6.5, 22, NOW(), NOW()),
('50000000-0000-4000-8000-000000000052', '40000000-0000-4000-8000-000000000026', 'INBOUND',  'Terminal Terrestre de Ica', 'UNICA', 6.7, 23, NOW(), NOW()),
-- ICA-10
('50000000-0000-4000-8000-000000000053', '40000000-0000-4000-8000-000000000027', 'OUTBOUND', 'Huacachina', 'Plaza de Armas de Ica', 8.2, 28, NOW(), NOW()),
('50000000-0000-4000-8000-000000000054', '40000000-0000-4000-8000-000000000027', 'INBOUND',  'Plaza de Armas de Ica', 'Huacachina', 8.4, 29, NOW(), NOW()),
-- HUAN-01
('50000000-0000-4000-8000-000000000055', '40000000-0000-4000-8000-000000000014', 'OUTBOUND', 'Plaza de Armas de Huánuco', 'UNAH', 3.2, 12, NOW(), NOW()),
('50000000-0000-4000-8000-000000000056', '40000000-0000-4000-8000-000000000014', 'INBOUND',  'UNAH', 'Plaza de Armas de Huánuco', 3.3, 12, NOW(), NOW()),
-- HUAN-02
('50000000-0000-4000-8000-000000000057', '40000000-0000-4000-8000-000000000015', 'OUTBOUND', 'Mercado Central de Huánuco', 'Hospital Regional Hermilio Valdizán', 2.8, 10, NOW(), NOW()),
('50000000-0000-4000-8000-000000000058', '40000000-0000-4000-8000-000000000015', 'INBOUND',  'Hospital Regional Hermilio Valdizán', 'Mercado Central de Huánuco', 2.9, 10, NOW(), NOW()),
-- HUAN-03
('50000000-0000-4000-8000-000000000059', '40000000-0000-4000-8000-000000000016', 'OUTBOUND', 'UNAH', 'Estadio Municipal de Huánuco', 4.1, 15, NOW(), NOW()),
('50000000-0000-4000-8000-000000000060', '40000000-0000-4000-8000-000000000016', 'INBOUND',  'Estadio Municipal de Huánuco', 'UNAH', 4.2, 15, NOW(), NOW()),
-- HUAN-04
('50000000-0000-4000-8000-000000000061', '40000000-0000-4000-8000-000000000017', 'OUTBOUND', 'Plaza de Armas de Huánuco', 'Jr. Huallaga', 2.5, 9, NOW(), NOW()),
('50000000-0000-4000-8000-000000000062', '40000000-0000-4000-8000-000000000017', 'INBOUND',  'Jr. Huallaga', 'Plaza de Armas de Huánuco', 2.6, 9, NOW(), NOW()),
-- HUAN-05
('50000000-0000-4000-8000-000000000063', '40000000-0000-4000-8000-000000000018', 'OUTBOUND', 'Terminal Terrestre de Huánuco', 'Av. Tingo María Norte', 5.5, 20, NOW(), NOW()),
('50000000-0000-4000-8000-000000000064', '40000000-0000-4000-8000-000000000018', 'INBOUND',  'Av. Tingo María Norte', 'Terminal Terrestre de Huánuco', 5.6, 20, NOW(), NOW()),
-- HUAN-06
('50000000-0000-4000-8000-000000000065', '40000000-0000-4000-8000-000000000019', 'OUTBOUND', 'Plaza de Armas de Huánuco', 'UNAH', 4.5, 16, NOW(), NOW()),
('50000000-0000-4000-8000-000000000066', '40000000-0000-4000-8000-000000000019', 'INBOUND',  'UNAH', 'Plaza de Armas de Huánuco', 4.6, 16, NOW(), NOW()),
-- HUAN-07
('50000000-0000-4000-8000-000000000067', '40000000-0000-4000-8000-000000000020', 'OUTBOUND', 'Centro Comercial Mega Plaza', 'San Francisco de Asís', 3.8, 13, NOW(), NOW()),
('50000000-0000-4000-8000-000000000068', '40000000-0000-4000-8000-000000000020', 'INBOUND',  'San Francisco de Asís', 'Centro Comercial Mega Plaza', 3.9, 13, NOW(), NOW()),
-- HUAN-08
('50000000-0000-4000-8000-000000000069', '40000000-0000-4000-8000-000000000021', 'OUTBOUND', 'Plaza de Armas de Huánuco', 'Mega Plaza', 3.5, 12, NOW(), NOW()),
('50000000-0000-4000-8000-000000000070', '40000000-0000-4000-8000-000000000021', 'INBOUND',  'Mega Plaza', 'Plaza de Armas de Huánuco', 3.6, 12, NOW(), NOW()),
-- HUAN-09
('50000000-0000-4000-8000-000000000071', '40000000-0000-4000-8000-000000000022', 'OUTBOUND', 'Terminal Terrestre de Huánuco', 'Barrio de Acomayo', 7.2, 25, NOW(), NOW()),
('50000000-0000-4000-8000-000000000072', '40000000-0000-4000-8000-000000000022', 'INBOUND',  'Barrio de Acomayo', 'Terminal Terrestre de Huánuco', 7.3, 25, NOW(), NOW()),
-- HUAN-10
('50000000-0000-4000-8000-000000000073', '40000000-0000-4000-8000-000000000023', 'OUTBOUND', 'Puente Huallaga', 'UNAH', 4.8, 17, NOW(), NOW()),
('50000000-0000-4000-8000-000000000074', '40000000-0000-4000-8000-000000000023', 'INBOUND',  'UNAH', 'Puente Huallaga', 4.9, 17, NOW(), NOW()),
-- CHIN-01
('50000000-0000-4000-8000-000000000075', '40000000-0000-4000-8000-000000000028', 'OUTBOUND', 'Plaza de Armas de Chincha', 'Terminal Terrestre de Chincha', 5.2, 18, NOW(), NOW()),
('50000000-0000-4000-8000-000000000076', '40000000-0000-4000-8000-000000000028', 'INBOUND',  'Terminal Terrestre de Chincha', 'Plaza de Armas de Chincha', 5.4, 19, NOW(), NOW()),
-- CHIN-02
('50000000-0000-4000-8000-000000000077', '40000000-0000-4000-8000-000000000029', 'OUTBOUND', 'Plaza de Armas de Chincha', 'Santuario Melchorita', 6.8, 22, NOW(), NOW()),
('50000000-0000-4000-8000-000000000078', '40000000-0000-4000-8000-000000000029', 'INBOUND',  'Santuario Melchorita', 'Plaza de Armas de Chincha', 7.0, 23, NOW(), NOW()),
-- CHIN-03
('50000000-0000-4000-8000-000000000079', '40000000-0000-4000-8000-000000000030', 'OUTBOUND', 'Mercado Modelo de Chincha', 'Puerto de Tambo de Mora', 9.5, 28, NOW(), NOW()),
('50000000-0000-4000-8000-000000000080', '40000000-0000-4000-8000-000000000030', 'INBOUND',  'Puerto de Tambo de Mora', 'Mercado Modelo de Chincha', 9.6, 29, NOW(), NOW()),
-- CHIN-04
('50000000-0000-4000-8000-000000000081', '40000000-0000-4000-8000-000000000031', 'OUTBOUND', 'Plaza Principal de Pueblo Nuevo', 'Hospital San José de Chincha', 5.8, 20, NOW(), NOW()),
('50000000-0000-4000-8000-000000000082', '40000000-0000-4000-8000-000000000031', 'INBOUND',  'Hospital San José de Chincha', 'Plaza Principal de Pueblo Nuevo', 6.0, 20, NOW(), NOW()),
-- CHIN-05
('50000000-0000-4000-8000-000000000083', '40000000-0000-4000-8000-000000000032', 'OUTBOUND', 'Óvalo de Chincha', 'Plaza de Armas de Sunampe', 6.2, 21, NOW(), NOW()),
('50000000-0000-4000-8000-000000000084', '40000000-0000-4000-8000-000000000032', 'INBOUND',  'Plaza de Armas de Sunampe', 'Óvalo de Chincha', 6.3, 21, NOW(), NOW()),
-- HYO-01
('50000000-0000-4000-8000-000000000085', '40000000-0000-4000-8000-000000000033', 'OUTBOUND', 'Plaza Principal de Chilca', 'Parque Bolognesi - El Tambo', 8.5, 30, NOW(), NOW()),
('50000000-0000-4000-8000-000000000086', '40000000-0000-4000-8000-000000000033', 'INBOUND',  'Parque Bolognesi - El Tambo', 'Plaza Principal de Chilca', 8.7, 31, NOW(), NOW()),
-- HYO-02
('50000000-0000-4000-8000-000000000087', '40000000-0000-4000-8000-000000000034', 'OUTBOUND', 'Plaza Huamanmarca', 'Ciudad Universitaria UNCP', 9.2, 32, NOW(), NOW()),
('50000000-0000-4000-8000-000000000088', '40000000-0000-4000-8000-000000000034', 'INBOUND',  'Ciudad Universitaria UNCP', 'Plaza Huamanmarca', 9.4, 33, NOW(), NOW()),
-- HYO-03
('50000000-0000-4000-8000-000000000089', '40000000-0000-4000-8000-000000000035', 'OUTBOUND', 'Terminal Terrestre Los Andes', 'Mercado de Chilca', 9.0, 28, NOW(), NOW()),
('50000000-0000-4000-8000-000000000090', '40000000-0000-4000-8000-000000000035', 'INBOUND',  'Mercado de Chilca', 'Terminal Terrestre Los Andes', 9.2, 29, NOW(), NOW()),
-- HYO-04
('50000000-0000-4000-8000-000000000091', '40000000-0000-4000-8000-000000000036', 'OUTBOUND', 'Plaza Huamanmarca', 'Plaza Independencia de Chupaca', 12.8, 40, NOW(), NOW()),
('50000000-0000-4000-8000-000000000092', '40000000-0000-4000-8000-000000000036', 'INBOUND',  'Plaza Independencia de Chupaca', 'Plaza Huamanmarca', 13.0, 41, NOW(), NOW()),
-- HYO-05
('50000000-0000-4000-8000-000000000093', '40000000-0000-4000-8000-000000000037', 'OUTBOUND', 'Plaza Constitución', 'Plaza Principal de San Jerónimo', 16.2, 48, NOW(), NOW()),
('50000000-0000-4000-8000-000000000094', '40000000-0000-4000-8000-000000000037', 'INBOUND',  'Plaza Principal de San Jerónimo', 'Plaza Constitución', 16.5, 49, NOW(), NOW()),
-- HYO-06
('50000000-0000-4000-8000-000000000095', '40000000-0000-4000-8000-000000000038', 'OUTBOUND', 'Hospital Regional Carrión', 'Parque de la Identidad Huanca', 6.5, 22, NOW(), NOW()),
('50000000-0000-4000-8000-000000000096', '40000000-0000-4000-8000-000000000038', 'INBOUND',  'Parque de la Identidad Huanca', 'Hospital Regional Carrión', 6.6, 23, NOW(), NOW()),
-- HYO-07
('50000000-0000-4000-8000-000000000097', '40000000-0000-4000-8000-000000000039', 'OUTBOUND', 'Plaza Principal de Chilca', 'Parque Bolognesi - El Tambo', 7.2, 25, NOW(), NOW()),
('50000000-0000-4000-8000-000000000098', '40000000-0000-4000-8000-000000000039', 'INBOUND',  'Parque Bolognesi - El Tambo', 'Plaza Principal de Chilca', 7.4, 26, NOW(), NOW()),
-- HYO-08
('50000000-0000-4000-8000-000000000099', '40000000-0000-4000-8000-000000000040', 'OUTBOUND', 'Terminal Terrestre Los Andes', 'Ciudad Universitaria UNCP', 7.8, 26, NOW(), NOW()),
('50000000-0000-4000-8000-000000000100', '40000000-0000-4000-8000-000000000040', 'INBOUND',  'Ciudad Universitaria UNCP', 'Terminal Terrestre Los Andes', 8.0, 27, NOW(), NOW()),
-- HYO-09
('50000000-0000-4000-8000-000000000101', '40000000-0000-4000-8000-000000000041', 'OUTBOUND', 'Mercado Mayorista de Huancayo', 'Plaza Independencia de Chupaca', 12.2, 38, NOW(), NOW()),
('50000000-0000-4000-8000-000000000102', '40000000-0000-4000-8000-000000000041', 'INBOUND',  'Plaza Independencia de Chupaca', 'Mercado Mayorista de Huancayo', 12.5, 39, NOW(), NOW()),
-- HYO-10
('50000000-0000-4000-8000-000000000103', '40000000-0000-4000-8000-000000000042', 'OUTBOUND', 'Plaza Huamanmarca', 'Plaza Principal de San Jerónimo', 17.0, 50, NOW(), NOW()),
('50000000-0000-4000-8000-000000000104', '40000000-0000-4000-8000-000000000042', 'INBOUND',  'Plaza Principal de San Jerónimo', 'Plaza Huamanmarca', 17.3, 51, NOW(), NOW());

-- ===========================================================================
-- RUTAS → PARADEROS (route_stops)
-- Cada dirección tiene al menos 3 paradas. Algunos hubs (Plaza de Armas,
-- Estación Central, Kennedy, Óvalo, mercado, Óvalo-Grau, etc.) logran que
-- varias rutas pasen por el mismo paradero.
-- ===========================================================================
INSERT INTO route_stops (id, direction_id, stop_id, stop_order, distance_from_start, created_at, updated_at) VALUES
-- LIMA-01 (ida: plaza→kennedy | vuelta: kennedy→plaza por benavides+mercado = DISTINTO TRAMO)
('60000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', 2, 1.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000007', 3, 7.9,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000006', 4, 12.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000006', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000008', 2, 0.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000007', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 3, 6.8,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000008', '50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 4, 13.2, NOW(), NOW()),
-- LIMA-02
('60000000-0000-4000-8000-000000000009', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000014', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000010', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 2, 3.1,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000011', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 3, 4.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000012', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000004', 4, 5.6,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000013', '50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000013', 5, 10.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000014', '50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000013', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000015', '50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 2, 5.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000016', '50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 3, 6.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000017', '50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 4, 7.7,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000018', '50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000014', 5, 10.9, NOW(), NOW()),
-- LIMA-03
('60000000-0000-4000-8000-000000000019', '50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000020', '50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 2, 1.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000021', '50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000007', 3, 8.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000022', '50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000006', 4, 9.1,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000023', '50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000008', 5, 10.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000024', '50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000009', 6, 14.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000025', '50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000009', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000026', '50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000008', 2, 4.3,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000027', '50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', 3, 5.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000028', '50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000001', 4, 13.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000029', '50000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000002', 5, 14.5, NOW(), NOW()),
-- LIMA-04
('60000000-0000-4000-8000-000000000030', '50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000001', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000031', '50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000002', 2, 1.3,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000032', '50000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000005', 3, 3.8,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000033', '50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000005', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000034', '50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000002', 2, 1.3,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000035', '50000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000001', 3, 3.9,  NOW(), NOW()),
-- LIMA-05
('60000000-0000-4000-8000-000000000036', '50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000003', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000037', '50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000001', 2, 1.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000038', '50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000010', 3, 3.1,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000039', '50000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000011', 4, 11.4, NOW(), NOW()),
('60000000-0000-4000-8000-000000000040', '50000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000011', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000041', '50000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000010', 2, 2.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000042', '50000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000001', 3, 8.3,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000043', '50000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000003', 4, 11.4, NOW(), NOW()),
-- LIMA-06
('60000000-0000-4000-8000-000000000044', '50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000010', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000045', '50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000001', 2, 0.8,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000046', '50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000007', 3, 8.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000047', '50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000008', 4, 9.6,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000048', '50000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000009', 5, 16.4, NOW(), NOW()),
('60000000-0000-4000-8000-000000000049', '50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000009', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000050', '50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000008', 2, 6.8,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000051', '50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000007', 3, 7.9,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000052', '50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000001', 4, 15.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000053', '50000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000010', 5, 16.4, NOW(), NOW()),
-- LIMA-07
('60000000-0000-4000-8000-000000000054', '50000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000007', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000055', '50000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000006', 2, 0.6,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000056', '50000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000008', 3, 3.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000057', '50000000-0000-4000-8000-000000000013', '30000000-0000-4000-8000-000000000009', 4, 7.7,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000058', '50000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000009', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000059', '50000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000008', 2, 4.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000060', '50000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000006', 3, 7.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000061', '50000000-0000-4000-8000-000000000014', '30000000-0000-4000-8000-000000000007', 4, 7.8,  NOW(), NOW()),
-- ICA-01
('60000000-0000-4000-8000-000000000062', '50000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000015', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000063', '50000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000018', 2, 2.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000064', '50000000-0000-4000-8000-000000000015', '30000000-0000-4000-8000-000000000021', 3, 8.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000065', '50000000-0000-4000-8000-000000000016', '30000000-0000-4000-8000-000000000021', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000066', '50000000-0000-4000-8000-000000000016', '30000000-0000-4000-8000-000000000018', 2, 5.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000067', '50000000-0000-4000-8000-000000000016', '30000000-0000-4000-8000-000000000015', 3, 8.8,  NOW(), NOW()),
-- ICA-02
('60000000-0000-4000-8000-000000000068', '50000000-0000-4000-8000-000000000017', '30000000-0000-4000-8000-000000000017', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000069', '50000000-0000-4000-8000-000000000017', '30000000-0000-4000-8000-000000000016', 2, 1.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000070', '50000000-0000-4000-8000-000000000017', '30000000-0000-4000-8000-000000000015', 3, 2.3,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000071', '50000000-0000-4000-8000-000000000017', '30000000-0000-4000-8000-000000000019', 4, 6.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000072', '50000000-0000-4000-8000-000000000018', '30000000-0000-4000-8000-000000000019', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000073', '50000000-0000-4000-8000-000000000018', '30000000-0000-4000-8000-000000000015', 2, 3.9,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000074', '50000000-0000-4000-8000-000000000018', '30000000-0000-4000-8000-000000000016', 3, 4.7,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000075', '50000000-0000-4000-8000-000000000018', '30000000-0000-4000-8000-000000000017', 4, 6.3,  NOW(), NOW()),
-- ICA-03
('60000000-0000-4000-8000-000000000076', '50000000-0000-4000-8000-000000000019', '30000000-0000-4000-8000-000000000022', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000077', '50000000-0000-4000-8000-000000000019', '30000000-0000-4000-8000-000000000017', 2, 1.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000078', '50000000-0000-4000-8000-000000000019', '30000000-0000-4000-8000-000000000015', 3, 2.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000079', '50000000-0000-4000-8000-000000000019', '30000000-0000-4000-8000-000000000018', 4, 4.9,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000080', '50000000-0000-4000-8000-000000000019', '30000000-0000-4000-8000-000000000016', 5, 7.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000081', '50000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000016', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000082', '50000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000018', 2, 2.7,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000083', '50000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000015', 3, 4.8,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000084', '50000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000017', 4, 6.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000085', '50000000-0000-4000-8000-000000000020', '30000000-0000-4000-8000-000000000022', 5, 7.6,  NOW(), NOW()),
-- ICA-04
('60000000-0000-4000-8000-000000000086', '50000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000015', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000087', '50000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000022', 2, 2.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000088', '50000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000024', 3, 7.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000089', '50000000-0000-4000-8000-000000000021', '30000000-0000-4000-8000-000000000025', 4, 9.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000090', '50000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000025', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000091', '50000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000024', 2, 2.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000092', '50000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000022', 3, 7.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000093', '50000000-0000-4000-8000-000000000022', '30000000-0000-4000-8000-000000000015', 4, 9.5,  NOW(), NOW()),
-- ICA-05
('60000000-0000-4000-8000-000000000094', '50000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000028', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000095', '50000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000022', 2, 2.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000096', '50000000-0000-4000-8000-000000000023', '30000000-0000-4000-8000-000000000027', 3, 6.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000097', '50000000-0000-4000-8000-000000000024', '30000000-0000-4000-8000-000000000027', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000098', '50000000-0000-4000-8000-000000000024', '30000000-0000-4000-8000-000000000022', 2, 3.6,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000099', '50000000-0000-4000-8000-000000000024', '30000000-0000-4000-8000-000000000028', 3, 6.0,  NOW(), NOW()),
-- ICA-06
('60000000-0000-4000-8000-000000000100', '50000000-0000-4000-8000-000000000025', '30000000-0000-4000-8000-000000000024', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000101', '50000000-0000-4000-8000-000000000025', '30000000-0000-4000-8000-000000000016', 2, 3.8,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000102', '50000000-0000-4000-8000-000000000025', '30000000-0000-4000-8000-000000000019', 3, 6.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000103', '50000000-0000-4000-8000-000000000025', '30000000-0000-4000-8000-000000000018', 4, 7.4,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000104', '50000000-0000-4000-8000-000000000026', '30000000-0000-4000-8000-000000000018', 1, 0.0,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000105', '50000000-0000-4000-8000-000000000026', '30000000-0000-4000-8000-000000000019', 2, 1.2,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000106', '50000000-0000-4000-8000-000000000026', '30000000-0000-4000-8000-000000000016', 3, 3.5,  NOW(), NOW()),
('60000000-0000-4000-8000-000000000107', '50000000-0000-4000-8000-000000000026', '30000000-0000-4000-8000-000000000024', 4, 7.3,  NOW(), NOW()),
-- ICA-07 (Centro – Cachiche – Subtanjalla)
('60000000-0000-4000-8000-000000000108', '50000000-0000-4000-8000-000000000047', '30000000-0000-4000-8000-000000000015', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000109', '50000000-0000-4000-8000-000000000047', '30000000-0000-4000-8000-000000000017', 2, 2.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000110', '50000000-0000-4000-8000-000000000047', '30000000-0000-4000-8000-000000000026', 3, 6.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000111', '50000000-0000-4000-8000-000000000047', '30000000-0000-4000-8000-000000000027', 4, 9.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000112', '50000000-0000-4000-8000-000000000048', '30000000-0000-4000-8000-000000000027', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000113', '50000000-0000-4000-8000-000000000048', '30000000-0000-4000-8000-000000000026', 2, 3.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000114', '50000000-0000-4000-8000-000000000048', '30000000-0000-4000-8000-000000000017', 3, 6.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000115', '50000000-0000-4000-8000-000000000048', '30000000-0000-4000-8000-000000000015', 4, 9.2, NOW(), NOW()),
-- ICA-08 (El Quinde – San Joaquín – Santuario)
('60000000-0000-4000-8000-000000000116', '50000000-0000-4000-8000-000000000049', '30000000-0000-4000-8000-000000000018', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000117', '50000000-0000-4000-8000-000000000049', '30000000-0000-4000-8000-000000000023', 2, 2.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000118', '50000000-0000-4000-8000-000000000049', '30000000-0000-4000-8000-000000000016', 3, 5.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000119', '50000000-0000-4000-8000-000000000050', '30000000-0000-4000-8000-000000000016', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000120', '50000000-0000-4000-8000-000000000050', '30000000-0000-4000-8000-000000000023', 2, 2.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000121', '50000000-0000-4000-8000-000000000050', '30000000-0000-4000-8000-000000000018', 3, 5.7, NOW(), NOW()),
-- ICA-09 (UNICA – Parcona – Terminal)
('60000000-0000-4000-8000-000000000122', '50000000-0000-4000-8000-000000000051', '30000000-0000-4000-8000-000000000019', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000123', '50000000-0000-4000-8000-000000000051', '30000000-0000-4000-8000-000000000024', 2, 3.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000124', '50000000-0000-4000-8000-000000000051', '30000000-0000-4000-8000-000000000028', 3, 6.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000125', '50000000-0000-4000-8000-000000000052', '30000000-0000-4000-8000-000000000028', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000126', '50000000-0000-4000-8000-000000000052', '30000000-0000-4000-8000-000000000024', 2, 3.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000127', '50000000-0000-4000-8000-000000000052', '30000000-0000-4000-8000-000000000019', 3, 6.7, NOW(), NOW()),
-- ICA-10 (Huacachina – La Tinguiña – Centro)
('60000000-0000-4000-8000-000000000128', '50000000-0000-4000-8000-000000000053', '30000000-0000-4000-8000-000000000021', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000129', '50000000-0000-4000-8000-000000000053', '30000000-0000-4000-8000-000000000025', 2, 3.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000130', '50000000-0000-4000-8000-000000000053', '30000000-0000-4000-8000-000000000015', 3, 6.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000131', '50000000-0000-4000-8000-000000000054', '30000000-0000-4000-8000-000000000015', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000132', '50000000-0000-4000-8000-000000000054', '30000000-0000-4000-8000-000000000025', 2, 2.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000133', '50000000-0000-4000-8000-000000000054', '30000000-0000-4000-8000-000000000021', 3, 6.2, NOW(), NOW()),
-- HUAN-01 (Plaza de Armas – UNAH)
('60000000-0000-4000-8000-000000000134', '50000000-0000-4000-8000-000000000055', '30000000-0000-4000-8000-000000000029', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000135', '50000000-0000-4000-8000-000000000055', '30000000-0000-4000-8000-000000000030', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000136', '50000000-0000-4000-8000-000000000055', '30000000-0000-4000-8000-000000000031', 3, 3.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000137', '50000000-0000-4000-8000-000000000056', '30000000-0000-4000-8000-000000000031', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000138', '50000000-0000-4000-8000-000000000056', '30000000-0000-4000-8000-000000000030', 2, 1.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000139', '50000000-0000-4000-8000-000000000056', '30000000-0000-4000-8000-000000000029', 3, 3.3, NOW(), NOW()),
-- HUAN-02 (Mercado Central – Hospital)
('60000000-0000-4000-8000-000000000140', '50000000-0000-4000-8000-000000000057', '30000000-0000-4000-8000-000000000030', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000141', '50000000-0000-4000-8000-000000000057', '30000000-0000-4000-8000-000000000034', 2, 1.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000142', '50000000-0000-4000-8000-000000000057', '30000000-0000-4000-8000-000000000032', 3, 2.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000143', '50000000-0000-4000-8000-000000000058', '30000000-0000-4000-8000-000000000032', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000144', '50000000-0000-4000-8000-000000000058', '30000000-0000-4000-8000-000000000034', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000145', '50000000-0000-4000-8000-000000000058', '30000000-0000-4000-8000-000000000030', 3, 2.9, NOW(), NOW()),
-- HUAN-03 (UNAH – Centro – Estadio)
('60000000-0000-4000-8000-000000000146', '50000000-0000-4000-8000-000000000059', '30000000-0000-4000-8000-000000000031', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000147', '50000000-0000-4000-8000-000000000059', '30000000-0000-4000-8000-000000000034', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000148', '50000000-0000-4000-8000-000000000059', '30000000-0000-4000-8000-000000000029', 3, 2.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000149', '50000000-0000-4000-8000-000000000059', '30000000-0000-4000-8000-000000000033', 4, 4.1, NOW(), NOW()),
('60000000-0000-4000-8000-000000000150', '50000000-0000-4000-8000-000000000060', '30000000-0000-4000-8000-000000000033', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000151', '50000000-0000-4000-8000-000000000060', '30000000-0000-4000-8000-000000000029', 2, 1.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000152', '50000000-0000-4000-8000-000000000060', '30000000-0000-4000-8000-000000000034', 3, 2.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000153', '50000000-0000-4000-8000-000000000060', '30000000-0000-4000-8000-000000000031', 4, 4.2, NOW(), NOW()),
-- HUAN-04 (Plaza – Jr. Huallaga)
('60000000-0000-4000-8000-000000000154', '50000000-0000-4000-8000-000000000061', '30000000-0000-4000-8000-000000000029', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000155', '50000000-0000-4000-8000-000000000061', '30000000-0000-4000-8000-000000000034', 2, 1.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000156', '50000000-0000-4000-8000-000000000061', '30000000-0000-4000-8000-000000000030', 3, 2.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000157', '50000000-0000-4000-8000-000000000062', '30000000-0000-4000-8000-000000000030', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000158', '50000000-0000-4000-8000-000000000062', '30000000-0000-4000-8000-000000000034', 2, 1.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000159', '50000000-0000-4000-8000-000000000062', '30000000-0000-4000-8000-000000000029', 3, 2.6, NOW(), NOW()),
-- HUAN-05 (Terminal – Tingo María Norte)
('60000000-0000-4000-8000-000000000160', '50000000-0000-4000-8000-000000000063', '30000000-0000-4000-8000-000000000036', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000161', '50000000-0000-4000-8000-000000000063', '30000000-0000-4000-8000-000000000040', 2, 2.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000162', '50000000-0000-4000-8000-000000000063', '30000000-0000-4000-8000-000000000035', 3, 5.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000163', '50000000-0000-4000-8000-000000000064', '30000000-0000-4000-8000-000000000035', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000164', '50000000-0000-4000-8000-000000000064', '30000000-0000-4000-8000-000000000040', 2, 3.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000165', '50000000-0000-4000-8000-000000000064', '30000000-0000-4000-8000-000000000036', 3, 5.6, NOW(), NOW()),
-- HUAN-06 (Centro – Estadio – UNAH)
('60000000-0000-4000-8000-000000000166', '50000000-0000-4000-8000-000000000065', '30000000-0000-4000-8000-000000000029', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000167', '50000000-0000-4000-8000-000000000065', '30000000-0000-4000-8000-000000000033', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000168', '50000000-0000-4000-8000-000000000065', '30000000-0000-4000-8000-000000000031', 3, 3.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000169', '50000000-0000-4000-8000-000000000065', '30000000-0000-4000-8000-000000000035', 4, 4.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000170', '50000000-0000-4000-8000-000000000066', '30000000-0000-4000-8000-000000000031', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000171', '50000000-0000-4000-8000-000000000066', '30000000-0000-4000-8000-000000000035', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000172', '50000000-0000-4000-8000-000000000066', '30000000-0000-4000-8000-000000000033', 3, 3.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000173', '50000000-0000-4000-8000-000000000066', '30000000-0000-4000-8000-000000000029', 4, 4.6, NOW(), NOW()),
-- HUAN-07 (Mega Plaza – San Francisco)
('60000000-0000-4000-8000-000000000174', '50000000-0000-4000-8000-000000000067', '30000000-0000-4000-8000-000000000038', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000175', '50000000-0000-4000-8000-000000000067', '30000000-0000-4000-8000-000000000034', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000176', '50000000-0000-4000-8000-000000000067', '30000000-0000-4000-8000-000000000037', 3, 3.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000177', '50000000-0000-4000-8000-000000000068', '30000000-0000-4000-8000-000000000037', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000178', '50000000-0000-4000-8000-000000000068', '30000000-0000-4000-8000-000000000034', 2, 1.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000179', '50000000-0000-4000-8000-000000000068', '30000000-0000-4000-8000-000000000038', 3, 3.9, NOW(), NOW()),
-- HUAN-08 (Centro – Hospital – Mega Plaza)
('60000000-0000-4000-8000-000000000180', '50000000-0000-4000-8000-000000000069', '30000000-0000-4000-8000-000000000029', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000181', '50000000-0000-4000-8000-000000000069', '30000000-0000-4000-8000-000000000032', 2, 1.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000182', '50000000-0000-4000-8000-000000000069', '30000000-0000-4000-8000-000000000038', 3, 3.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000183', '50000000-0000-4000-8000-000000000070', '30000000-0000-4000-8000-000000000038', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000184', '50000000-0000-4000-8000-000000000070', '30000000-0000-4000-8000-000000000032', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000185', '50000000-0000-4000-8000-000000000070', '30000000-0000-4000-8000-000000000029', 3, 3.6, NOW(), NOW()),
-- HUAN-09 (Terminal – Acomayo – Centro)
('60000000-0000-4000-8000-000000000186', '50000000-0000-4000-8000-000000000071', '30000000-0000-4000-8000-000000000036', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000187', '50000000-0000-4000-8000-000000000071', '30000000-0000-4000-8000-000000000039', 2, 3.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000188', '50000000-0000-4000-8000-000000000071', '30000000-0000-4000-8000-000000000029', 3, 7.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000189', '50000000-0000-4000-8000-000000000072', '30000000-0000-4000-8000-000000000029', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000190', '50000000-0000-4000-8000-000000000072', '30000000-0000-4000-8000-000000000039', 2, 3.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000191', '50000000-0000-4000-8000-000000000072', '30000000-0000-4000-8000-000000000036', 3, 7.3, NOW(), NOW()),
-- HUAN-10 (Puente Huallaga – Plaza – UNAH)
('60000000-0000-4000-8000-000000000192', '50000000-0000-4000-8000-000000000073', '30000000-0000-4000-8000-000000000040', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000193', '50000000-0000-4000-8000-000000000073', '30000000-0000-4000-8000-000000000029', 2, 1.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000194', '50000000-0000-4000-8000-000000000073', '30000000-0000-4000-8000-000000000031', 3, 3.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000195', '50000000-0000-4000-8000-000000000074', '30000000-0000-4000-8000-000000000031', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000196', '50000000-0000-4000-8000-000000000074', '30000000-0000-4000-8000-000000000029', 2, 1.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000197', '50000000-0000-4000-8000-000000000074', '30000000-0000-4000-8000-000000000040', 3, 3.1, NOW(), NOW()),
-- CHIN-01 (Plaza de Armas – Mercado – Terminal Terrestre)
('60000000-0000-4000-8000-000000000198', '50000000-0000-4000-8000-000000000075', '30000000-0000-4000-8000-000000000041', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000199', '50000000-0000-4000-8000-000000000075', '30000000-0000-4000-8000-000000000042', 2, 1.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000200', '50000000-0000-4000-8000-000000000075', '30000000-0000-4000-8000-000000000049', 3, 3.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000201', '50000000-0000-4000-8000-000000000075', '30000000-0000-4000-8000-000000000048', 4, 5.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000202', '50000000-0000-4000-8000-000000000076', '30000000-0000-4000-8000-000000000048', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000203', '50000000-0000-4000-8000-000000000076', '30000000-0000-4000-8000-000000000049', 2, 1.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000204', '50000000-0000-4000-8000-000000000076', '30000000-0000-4000-8000-000000000042', 3, 4.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000205', '50000000-0000-4000-8000-000000000076', '30000000-0000-4000-8000-000000000041', 4, 5.4, NOW(), NOW()),
-- CHIN-02 (Chincha Centro – Grocio Prado – Melchorita)
('60000000-0000-4000-8000-000000000206', '50000000-0000-4000-8000-000000000077', '30000000-0000-4000-8000-000000000041', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000207', '50000000-0000-4000-8000-000000000077', '30000000-0000-4000-8000-000000000042', 2, 1.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000208', '50000000-0000-4000-8000-000000000077', '30000000-0000-4000-8000-000000000043', 3, 5.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000209', '50000000-0000-4000-8000-000000000077', '30000000-0000-4000-8000-000000000044', 4, 6.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000210', '50000000-0000-4000-8000-000000000078', '30000000-0000-4000-8000-000000000044', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000211', '50000000-0000-4000-8000-000000000078', '30000000-0000-4000-8000-000000000043', 2, 1.3, NOW(), NOW()),
('60000000-0000-4000-8000-000000000212', '50000000-0000-4000-8000-000000000078', '30000000-0000-4000-8000-000000000042', 3, 5.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000213', '50000000-0000-4000-8000-000000000078', '30000000-0000-4000-8000-000000000041', 4, 7.0, NOW(), NOW()),
-- CHIN-03 (Mercado Modelo – Sunampe – Tambo de Mora)
('60000000-0000-4000-8000-000000000214', '50000000-0000-4000-8000-000000000079', '30000000-0000-4000-8000-000000000042', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000215', '50000000-0000-4000-8000-000000000079', '30000000-0000-4000-8000-000000000045', 2, 3.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000216', '50000000-0000-4000-8000-000000000079', '30000000-0000-4000-8000-000000000046', 3, 9.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000217', '50000000-0000-4000-8000-000000000080', '30000000-0000-4000-8000-000000000046', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000218', '50000000-0000-4000-8000-000000000080', '30000000-0000-4000-8000-000000000045', 2, 5.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000219', '50000000-0000-4000-8000-000000000080', '30000000-0000-4000-8000-000000000042', 3, 9.6, NOW(), NOW()),
-- CHIN-04 (Pueblo Nuevo – Plaza de Armas – Hospital)
('60000000-0000-4000-8000-000000000220', '50000000-0000-4000-8000-000000000081', '30000000-0000-4000-8000-000000000047', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000221', '50000000-0000-4000-8000-000000000081', '30000000-0000-4000-8000-000000000041', 2, 2.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000222', '50000000-0000-4000-8000-000000000081', '30000000-0000-4000-8000-000000000049', 3, 5.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000223', '50000000-0000-4000-8000-000000000082', '30000000-0000-4000-8000-000000000049', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000224', '50000000-0000-4000-8000-000000000082', '30000000-0000-4000-8000-000000000041', 2, 3.3, NOW(), NOW()),
('60000000-0000-4000-8000-000000000225', '50000000-0000-4000-8000-000000000082', '30000000-0000-4000-8000-000000000047', 3, 6.0, NOW(), NOW()),
-- CHIN-05 (Óvalo Panamericana – Plaza – Sunampe)
('60000000-0000-4000-8000-000000000226', '50000000-0000-4000-8000-000000000083', '30000000-0000-4000-8000-000000000050', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000227', '50000000-0000-4000-8000-000000000083', '30000000-0000-4000-8000-000000000048', 2, 1.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000228', '50000000-0000-4000-8000-000000000083', '30000000-0000-4000-8000-000000000041', 3, 3.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000229', '50000000-0000-4000-8000-000000000083', '30000000-0000-4000-8000-000000000045', 4, 6.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000230', '50000000-0000-4000-8000-000000000084', '30000000-0000-4000-8000-000000000045', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000231', '50000000-0000-4000-8000-000000000084', '30000000-0000-4000-8000-000000000041', 2, 2.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000232', '50000000-0000-4000-8000-000000000084', '30000000-0000-4000-8000-000000000048', 3, 5.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000233', '50000000-0000-4000-8000-000000000084', '30000000-0000-4000-8000-000000000050', 4, 6.3, NOW(), NOW()),
-- HYO-01 (Chilca – Huancayo Centro – El Tambo)
('60000000-0000-4000-8000-000000000234', '50000000-0000-4000-8000-000000000085', '30000000-0000-4000-8000-000000000057', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000235', '50000000-0000-4000-8000-000000000085', '30000000-0000-4000-8000-000000000053', 2, 2.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000236', '50000000-0000-4000-8000-000000000085', '30000000-0000-4000-8000-000000000052', 3, 4.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000237', '50000000-0000-4000-8000-000000000085', '30000000-0000-4000-8000-000000000055', 4, 8.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000238', '50000000-0000-4000-8000-000000000086', '30000000-0000-4000-8000-000000000055', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000239', '50000000-0000-4000-8000-000000000086', '30000000-0000-4000-8000-000000000052', 2, 4.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000240', '50000000-0000-4000-8000-000000000086', '30000000-0000-4000-8000-000000000053', 3, 5.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000241', '50000000-0000-4000-8000-000000000086', '30000000-0000-4000-8000-000000000057', 4, 8.7, NOW(), NOW()),
-- HYO-02 (Plaza Huamanmarca – El Tambo – UNCP)
('60000000-0000-4000-8000-000000000242', '50000000-0000-4000-8000-000000000087', '30000000-0000-4000-8000-000000000051', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000243', '50000000-0000-4000-8000-000000000087', '30000000-0000-4000-8000-000000000054', 2, 1.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000244', '50000000-0000-4000-8000-000000000087', '30000000-0000-4000-8000-000000000055', 3, 4.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000245', '50000000-0000-4000-8000-000000000087', '30000000-0000-4000-8000-000000000056', 4, 9.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000246', '50000000-0000-4000-8000-000000000088', '30000000-0000-4000-8000-000000000056', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000247', '50000000-0000-4000-8000-000000000088', '30000000-0000-4000-8000-000000000055', 2, 4.4, NOW(), NOW()),
('60000000-0000-4000-8000-000000000248', '50000000-0000-4000-8000-000000000088', '30000000-0000-4000-8000-000000000054', 3, 8.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000249', '50000000-0000-4000-8000-000000000088', '30000000-0000-4000-8000-000000000051', 4, 9.4, NOW(), NOW()),
-- HYO-03 (Terminal Los Andes – Calle Real – Chilca)
('60000000-0000-4000-8000-000000000250', '50000000-0000-4000-8000-000000000089', '30000000-0000-4000-8000-000000000059', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000251', '50000000-0000-4000-8000-000000000089', '30000000-0000-4000-8000-000000000052', 2, 4.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000252', '50000000-0000-4000-8000-000000000089', '30000000-0000-4000-8000-000000000053', 3, 5.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000253', '50000000-0000-4000-8000-000000000089', '30000000-0000-4000-8000-000000000058', 4, 9.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000254', '50000000-0000-4000-8000-000000000090', '30000000-0000-4000-8000-000000000058', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000255', '50000000-0000-4000-8000-000000000090', '30000000-0000-4000-8000-000000000053', 2, 3.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000256', '50000000-0000-4000-8000-000000000090', '30000000-0000-4000-8000-000000000052', 3, 4.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000257', '50000000-0000-4000-8000-000000000090', '30000000-0000-4000-8000-000000000059', 4, 9.2, NOW(), NOW()),
-- HYO-04 (Huancayo Centro – Puente Chupaca – Chupaca)
('60000000-0000-4000-8000-000000000258', '50000000-0000-4000-8000-000000000091', '30000000-0000-4000-8000-000000000051', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000259', '50000000-0000-4000-8000-000000000091', '30000000-0000-4000-8000-000000000060', 2, 2.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000260', '50000000-0000-4000-8000-000000000091', '30000000-0000-4000-8000-000000000064', 3, 9.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000261', '50000000-0000-4000-8000-000000000091', '30000000-0000-4000-8000-000000000065', 4, 12.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000262', '50000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000065', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000263', '50000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000064', 2, 3.3, NOW(), NOW()),
('60000000-0000-4000-8000-000000000264', '50000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000060', 3, 10.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000265', '50000000-0000-4000-8000-000000000092', '30000000-0000-4000-8000-000000000051', 4, 13.0, NOW(), NOW()),
-- HYO-05 (Plaza Constitución – El Tambo – San Jerónimo)
('60000000-0000-4000-8000-000000000266', '50000000-0000-4000-8000-000000000093', '30000000-0000-4000-8000-000000000052', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000267', '50000000-0000-4000-8000-000000000093', '30000000-0000-4000-8000-000000000055', 2, 4.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000268', '50000000-0000-4000-8000-000000000093', '30000000-0000-4000-8000-000000000056', 3, 8.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000269', '50000000-0000-4000-8000-000000000093', '30000000-0000-4000-8000-000000000062', 4, 16.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000270', '50000000-0000-4000-8000-000000000094', '30000000-0000-4000-8000-000000000062', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000271', '50000000-0000-4000-8000-000000000094', '30000000-0000-4000-8000-000000000056', 2, 7.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000272', '50000000-0000-4000-8000-000000000094', '30000000-0000-4000-8000-000000000055', 3, 12.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000273', '50000000-0000-4000-8000-000000000094', '30000000-0000-4000-8000-000000000052', 4, 16.5, NOW(), NOW()),
-- HYO-06 (Hospital Carrión – Mayorista – Parque Identidad)
('60000000-0000-4000-8000-000000000274', '50000000-0000-4000-8000-000000000095', '30000000-0000-4000-8000-000000000060', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000275', '50000000-0000-4000-8000-000000000095', '30000000-0000-4000-8000-000000000053', 2, 2.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000276', '50000000-0000-4000-8000-000000000095', '30000000-0000-4000-8000-000000000054', 3, 3.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000277', '50000000-0000-4000-8000-000000000095', '30000000-0000-4000-8000-000000000063', 4, 6.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000278', '50000000-0000-4000-8000-000000000096', '30000000-0000-4000-8000-000000000063', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000279', '50000000-0000-4000-8000-000000000096', '30000000-0000-4000-8000-000000000054', 2, 2.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000280', '50000000-0000-4000-8000-000000000096', '30000000-0000-4000-8000-000000000053', 3, 4.3, NOW(), NOW()),
('60000000-0000-4000-8000-000000000281', '50000000-0000-4000-8000-000000000096', '30000000-0000-4000-8000-000000000060', 4, 6.6, NOW(), NOW()),
-- HYO-07 (Chilca – Hospital El Carmen – Parque Bolognesi)
('60000000-0000-4000-8000-000000000282', '50000000-0000-4000-8000-000000000097', '30000000-0000-4000-8000-000000000057', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000283', '50000000-0000-4000-8000-000000000097', '30000000-0000-4000-8000-000000000061', 2, 2.5, NOW(), NOW()),
('60000000-0000-4000-8000-000000000284', '50000000-0000-4000-8000-000000000097', '30000000-0000-4000-8000-000000000051', 3, 3.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000285', '50000000-0000-4000-8000-000000000097', '30000000-0000-4000-8000-000000000055', 4, 7.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000286', '50000000-0000-4000-8000-000000000098', '30000000-0000-4000-8000-000000000055', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000287', '50000000-0000-4000-8000-000000000098', '30000000-0000-4000-8000-000000000051', 2, 3.4, NOW(), NOW()),
('60000000-0000-4000-8000-000000000288', '50000000-0000-4000-8000-000000000098', '30000000-0000-4000-8000-000000000061', 3, 4.7, NOW(), NOW()),
('60000000-0000-4000-8000-000000000289', '50000000-0000-4000-8000-000000000098', '30000000-0000-4000-8000-000000000057', 4, 7.4, NOW(), NOW()),
-- HYO-08 (Terminal Los Andes – Hospital El Carmen – UNCP)
('60000000-0000-4000-8000-000000000290', '50000000-0000-4000-8000-000000000099', '30000000-0000-4000-8000-000000000059', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000291', '50000000-0000-4000-8000-000000000099', '30000000-0000-4000-8000-000000000061', 2, 3.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000292', '50000000-0000-4000-8000-000000000099', '30000000-0000-4000-8000-000000000055', 3, 5.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000293', '50000000-0000-4000-8000-000000000099', '30000000-0000-4000-8000-000000000056', 4, 7.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000294', '50000000-0000-4000-8000-000000000100', '30000000-0000-4000-8000-000000000056', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000295', '50000000-0000-4000-8000-000000000100', '30000000-0000-4000-8000-000000000055', 2, 2.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000296', '50000000-0000-4000-8000-000000000100', '30000000-0000-4000-8000-000000000061', 3, 4.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000297', '50000000-0000-4000-8000-000000000100', '30000000-0000-4000-8000-000000000059', 4, 8.0, NOW(), NOW()),
-- HYO-09 (Mercado Mayorista – Puente Chupaca – Chupaca)
('60000000-0000-4000-8000-000000000298', '50000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000053', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000299', '50000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000060', 2, 1.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000300', '50000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000064', 3, 8.9, NOW(), NOW()),
('60000000-0000-4000-8000-000000000301', '50000000-0000-4000-8000-000000000101', '30000000-0000-4000-8000-000000000065', 4, 12.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000302', '50000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000065', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000303', '50000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000064', 2, 3.3, NOW(), NOW()),
('60000000-0000-4000-8000-000000000304', '50000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000060', 3, 10.4, NOW(), NOW()),
('60000000-0000-4000-8000-000000000305', '50000000-0000-4000-8000-000000000102', '30000000-0000-4000-8000-000000000053', 4, 12.5, NOW(), NOW()),
-- HYO-10 (Plaza Huamanmarca – Parque Identidad – San Jerónimo)
('60000000-0000-4000-8000-000000000306', '50000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000051', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000307', '50000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000063', 2, 3.2, NOW(), NOW()),
('60000000-0000-4000-8000-000000000308', '50000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000056', 3, 8.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000309', '50000000-0000-4000-8000-000000000103', '30000000-0000-4000-8000-000000000062', 4, 17.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000310', '50000000-0000-4000-8000-000000000104', '30000000-0000-4000-8000-000000000062', 1, 0.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000311', '50000000-0000-4000-8000-000000000104', '30000000-0000-4000-8000-000000000056', 2, 9.0, NOW(), NOW()),
('60000000-0000-4000-8000-000000000312', '50000000-0000-4000-8000-000000000104', '30000000-0000-4000-8000-000000000063', 3, 13.8, NOW(), NOW()),
('60000000-0000-4000-8000-000000000313', '50000000-0000-4000-8000-000000000104', '30000000-0000-4000-8000-000000000051', 4, 17.3, NOW(), NOW());


-- ===========================================================================
-- PUNTOS DE RUTA (polilínea por dirección)
-- Generado a partir del itinerario real de cada dirección (point_order = stop_order)
-- para que coincida con las paradas. Añadimos además un punto intermedio en cada
-- tramo para dar curvatura al trazado.
-- ===========================================================================
INSERT INTO route_points (id, direction_id, point_order, location, created_at)
SELECT
  ('70000000-0000-4000-8000-' || LPAD(ROW_NUMBER() OVER (ORDER BY rs.direction_id, rs.stop_order)::text, 12, '0'))::uuid,
  rs.direction_id,
  rs.stop_order AS point_order,
  s.location,
  NOW()
FROM route_stops rs
JOIN stops s ON s.id = rs.stop_id
ORDER BY rs.direction_id, rs.stop_order;

-- ===========================================================================
-- VEHÍCULOS + UBICACIONES EN TIEMPO REAL (demo)
-- ===========================================================================
INSERT INTO vehicles (id, route_id, plate, internal_code, status, created_at, updated_at) VALUES
('80000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001', 'ABC-123', 'V-101', 'ACTIVE', NOW(), NOW()),
('80000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001', 'DEF-456', 'V-102', 'ACTIVE', NOW(), NOW()),
('80000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003', 'GHI-789', 'V-103', 'ACTIVE', NOW(), NOW()),
('80000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003', 'JKL-012', 'V-104', 'ACTIVE', NOW(), NOW()),
('80000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000010', 'MNO-345', 'V-105', 'ACTIVE', NOW(), NOW()),
('80000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000010', 'PQR-678', 'V-106', 'MAINTENANCE', NOW(), NOW());

INSERT INTO vehicle_locations (id, vehicle_id, latitude, longitude, speed, heading, recorded_at) VALUES
('90000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', -12.0600, -77.0290, 35.5, 185.0, NOW()),
('90000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', -12.0950, -77.0300, 42.0, 190.0, NOW() - INTERVAL '5 minutes'),
('90000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000003', -12.0700, -77.0290, 38.0, 180.0, NOW()),
('90000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000003', -12.1100, -77.0290, 30.0, 170.0, NOW() - INTERVAL '5 minutes'),
('90000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000005', -14.0700, -75.7320, 25.0, 120.0, NOW()),
('90000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000005', -14.0800, -75.7400, 20.0, 110.0, NOW() - INTERVAL '5 minutes');

-- ===========================================================================
-- COMUNIDAD: PUBLICACIONES Y COMENTARIOS (demo)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_alias VARCHAR(50) NOT NULL,
    author_device_id VARCHAR(64) NOT NULL,
    category VARCHAR(30) NOT NULL,
    content VARCHAR(600) NOT NULL,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_alias VARCHAR(50) NOT NULL,
    author_device_id VARCHAR(64) NOT NULL,
    content VARCHAR(400) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_community_post_like_device UNIQUE (post_id, device_id)
);

TRUNCATE TABLE community_post_likes, community_comments, community_posts RESTART IDENTITY CASCADE;

INSERT INTO community_posts (id, author_alias, author_device_id, category, content, route_id, city_id, likes_count, comments_count, created_at, updated_at) VALUES
('a0000000-0000-4000-8000-000000000001', 'Carlos M.',    'seed-device-1', 'ALERTA',           'Tráfico lento cerca de Av. Los Maestros frente a El Quinde por obras en la vía. Tomen precauciones si van hacia Huacachina.', '40000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000002', 5, 2, NOW() - INTERVAL '25 minutes', NOW() - INTERVAL '25 minutes'),
('a0000000-0000-4000-8000-000000000002', 'Lucía Vargas', 'seed-device-2', 'PREGUNTA',         '¿Alguien sabe hasta qué hora están pasando las unidades hacia la UNICA hoy por la noche?',                                     '40000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000002', 3, 1, NOW() - INTERVAL '1 hour',     NOW() - INTERVAL '1 hour'),
('a0000000-0000-4000-8000-000000000003', 'Jorge R.',     'seed-device-3', 'RECOMENDACION',    'La ruta ICA-06 está pasando súper puntual cada 8-10 minutos en el paradero de Parcona hacia El Quinde.',                      '40000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000002', 7, 0, NOW() - INTERVAL '3 hours',    NOW() - INTERVAL '3 hours'),
('a0000000-0000-4000-8000-000000000004', 'Mariana P.',   'seed-device-4', 'OBJETOS_PERDIDOS', 'Buenas tardes, dejé una carpeta azul con documentos en la unidad hacia Plaza de Armas hace media hora. Si alguien la vio, por favor avise por aquí.', '40000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000002', 4, 0, NOW() - INTERVAL '4 hours', NOW() - INTERVAL '4 hours');

INSERT INTO community_comments (id, post_id, author_alias, author_device_id, content, created_at) VALUES
('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Pedro Ica',    'seed-device-5', 'Confirmo, están desviando una cuadra antes de llegar al centro comercial.', NOW() - INTERVAL '18 minutes'),
('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Ana Torres',   'seed-device-6', '¡Gracias por el dato! Mejor bajo en el paradero anterior.',                 NOW() - INTERVAL '10 minutes'),
('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'Diego UNICA',  'seed-device-7', 'Normalmente pasan hasta las 9:30 pm por el Mercado Modelo.',                 NOW() - INTERVAL '40 minutes');

-- ---------------------------------------------------------------------------
-- VERIFICACIÓN: conteo por tabla
-- ---------------------------------------------------------------------------
SELECT 'ciudades' AS tabla, COUNT(*) AS registros FROM cities
UNION ALL SELECT 'líneas', COUNT(*) FROM transport_lines
UNION ALL SELECT 'paraderos', COUNT(*) FROM stops
UNION ALL SELECT 'rutas', COUNT(*) FROM routes
UNION ALL SELECT 'direcciones', COUNT(*) FROM route_directions
UNION ALL SELECT 'parada-dirección', COUNT(*) FROM route_stops
UNION ALL SELECT 'puntos-ruta', COUNT(*) FROM route_points
UNION ALL SELECT 'vehículos', COUNT(*) FROM vehicles
UNION ALL SELECT 'ubicaciones', COUNT(*) FROM vehicle_locations
UNION ALL SELECT 'comunidad-posts', COUNT(*) FROM community_posts
UNION ALL SELECT 'comunidad-comentarios', COUNT(*) FROM community_comments;

-- Hubs (paraderos por donde pasan ≥3 rutas)
SELECT s.name AS paradero, COUNT(DISTINCT d.route_id) AS n_rutas
FROM route_stops rs
JOIN route_directions d ON d.id = rs.direction_id
JOIN stops s ON s.id = rs.stop_id
GROUP BY s.name
HAVING COUNT(DISTINCT d.route_id) >= 3
ORDER BY n_rutas DESC;

COMMIT;