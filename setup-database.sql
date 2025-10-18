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

-- Insert some sample data (optional)
INSERT INTO newsletter_subscribers (email) VALUES 
    ('test@example.com') 
ON CONFLICT (email) DO NOTHING;

-- Verify tables were created
\dt
