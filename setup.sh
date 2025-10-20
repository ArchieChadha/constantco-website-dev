#!/bin/bash

# Constant & Co Website Setup Script
echo "🚀 Setting up Constant & Co Website..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd api && npm install && cd ..

# Check if PostgreSQL is running
echo "🔍 Checking PostgreSQL..."
if ! pg_isready -q; then
    echo "⚠️  PostgreSQL is not running. Please start it first:"
    echo "   brew services start postgresql"
    echo "   OR"
    echo "   sudo systemctl start postgresql"
    exit 1
fi

# Create database
echo "🗄️  Setting up database..."
psql -U postgres -c "CREATE DATABASE constant_co;" 2>/dev/null || echo "Database might already exist"

# Create tables
echo "📋 Creating tables..."
psql -U postgres -d constant_co -f setup-database.sql

# Create .env file if it doesn't exist
if [ ! -f "api/.env" ]; then
    echo "⚙️  Creating .env file..."
    cat > api/.env << EOF
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=
PGDATABASE=constant_co
PORT=3001
EOF
    echo "📝 Please edit api/.env and add your PostgreSQL password"
fi

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit api/.env and add your PostgreSQL password"
echo "2. Start the server: cd api && node server.js"
echo "3. Open src/index.html in your browser"
echo ""
echo "For detailed instructions, see setup.md"
