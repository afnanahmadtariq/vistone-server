-- Create all PostgreSQL schemas for microservices
-- Run this SQL against your PostgreSQL database before running migrations

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS workforce;
CREATE SCHEMA IF NOT EXISTS project;
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS communication;
CREATE SCHEMA IF NOT EXISTS monitoring;
CREATE SCHEMA IF NOT EXISTS notification;

-- Grant permissions (adjust the username as needed)
GRANT ALL ON SCHEMA auth TO neondb_owner;
GRANT ALL ON SCHEMA workforce TO neondb_owner;
GRANT ALL ON SCHEMA project TO neondb_owner;
GRANT ALL ON SCHEMA client TO neondb_owner;
GRANT ALL ON SCHEMA knowledge TO neondb_owner;
GRANT ALL ON SCHEMA communication TO neondb_owner;
GRANT ALL ON SCHEMA monitoring TO neondb_owner;
GRANT ALL ON SCHEMA notification TO neondb_owner;
