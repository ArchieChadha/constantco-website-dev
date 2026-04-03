-- Database setup script for Constant & Co website
-- Run this script to create the required database and tables

-- Create database (run this first)
-- CREATE DATABASE constant_co;

-- Connect to the database and create tables
\c constant_co;

-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Contact messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Portal clients table
CREATE TABLE IF NOT EXISTS portal_clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    client_type VARCHAR(50),
    service VARCHAR(100),
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE portal_clients ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- One-time password reset tokens (hashed)
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets (email);

-- Insert some sample data (optional)
INSERT INTO newsletter_subscribers (email) VALUES 
    ('test@example.com') 
ON CONFLICT (email) DO NOTHING;

-- Verify tables were created
\dt
