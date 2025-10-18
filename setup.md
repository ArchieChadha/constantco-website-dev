# Constant & Co Website Setup Instructions

## Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)

## Quick Setup

### 1. Install Dependencies
```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd api
npm install
cd ..
```

### 2. Database Setup
```bash
# Start PostgreSQL (if not already running)
# On macOS with Homebrew:
brew services start postgresql

# Create database and tables
psql -U postgres -c "CREATE DATABASE constant_co;"
psql -U postgres -d constant_co -c "
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

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
"
```

### 3. Environment Configuration
Create a `.env` file in the `api/` directory:
```bash
cd api
cat > .env << EOF
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_postgres_password
PGDATABASE=constant_co
PORT=3001
EOF
```

### 4. Start the Application
```bash
# Start the API server
cd api
node server.js

# In another terminal, open the website
open src/index.html
# OR serve with a local server:
# python -m http.server 8000
# Then visit http://localhost:8000/src/
```

## Testing
```bash
# Run the test suite
node tests/run-tests.js
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `brew services list | grep postgres`
- Check if the database exists: `psql -U postgres -l`
- Verify credentials in `.env` file

### Port Issues
- Default API port: 3001
- Change in `.env` if needed: `PORT=3001`

### Dependencies
- If tests fail, install jsdom: `npm install jsdom`
