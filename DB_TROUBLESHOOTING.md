# Database Connection Troubleshooting

## Issue
Cannot connect to Supabase PostgreSQL database.

**Error:** `getaddrinfo ENOTFOUND db.arhcaivvopvthcjcgokd.supabase.co`

## Current Connection String
```
postgresql://postgres:tU!_HU9pewUW.Hs@db.arhcaivvopvthcjcgokd.supabase.co:5432/postgres
```

## Solutions to Try

### Option 1: Use Supabase Pooler Connection (Recommended)
```bash
# Edit backend/.env and analytics-service/.env
# Replace DATABASE_URL with:
DATABASE_URL=postgresql://postgres.arhcaivvopvthcjcgokd:tU!_HU9pewUW.Hs@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### Option 2: Use Direct Connection
```bash
# Try direct connection (port 5432)
DATABASE_URL=postgresql://postgres:tU!_HU9pewUW.Hs@aws-0-ap-south-1.pooler.supabase.com:5432/postgres
```

### Option 3: Install PostgreSQL Locally
```bash
# Install
brew install postgresql@15
brew services start postgresql@15

# Create database
createdb memory_os_local

# Update .env
DATABASE_URL=postgresql://localhost:5432/memory_os_local

#Apply schema
psql memory_os_local < backend/src/db/schema.sql
```

### Option 4: Use SQLite (Temporary)
```bash
# Quick testing without PostgreSQL
# I can modify the code to use SQLite instead
```

## Status
-  DNS resolution failing for `db.arhcaivvopvthcjcgokd.supabase.co`
- ✅ Internet connectivity working
- ✅ Gemini API configured
- ✅ Dependencies installed

## Next Steps
Choose one of the options above to proceed with testing.
