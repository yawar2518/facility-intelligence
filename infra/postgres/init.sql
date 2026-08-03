-- ============================================================
-- PostgreSQL Initialization Script
-- Runs once when the container is first created
-- ============================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Enable PostGIS if needed later (geospatial)
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify extensions loaded
SELECT default_version, installed_version
FROM pg_available_extensions
WHERE name = 'timescaledb';