CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE vehicles (
    id VARCHAR(50) PRIMARY KEY,
    current_location GEOMETRY(Point, 4326),
    status VARCHAR(20)
);

CREATE TABLE traffic_signals (
    id VARCHAR(50) PRIMARY KEY,
    location GEOMETRY(Point, 4326),
    state VARCHAR(50)
);

CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    vehicle_id VARCHAR(50) REFERENCES vehicles(id),
    path GEOMETRY(LineString, 4326)
);

-- Insert contiguous mock signals for the routing simulation
INSERT INTO traffic_signals (id, location, state) VALUES
('sig_1', ST_SetSRID(ST_MakePoint(88.3639, 22.5726), 4326), 'NORMAL'),
('sig_2', ST_SetSRID(ST_MakePoint(88.3650, 22.5740), 4326), 'NORMAL'),
('sig_3', ST_SetSRID(ST_MakePoint(88.3675, 22.5765), 4326), 'NORMAL'),
('sig_4', ST_SetSRID(ST_MakePoint(88.3700, 22.5790), 4326), 'NORMAL'),
('sig_5', ST_SetSRID(ST_MakePoint(88.3725, 22.5815), 4326), 'NORMAL');