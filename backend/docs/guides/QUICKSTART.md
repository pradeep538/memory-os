# Memory OS Backend - Quick Start

## Setup Steps

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Create Database
```bash
# Create PostgreSQL database
createdb memory_os

# Or using psql
psql postgres -c "CREATE DATABASE memory_os;"
```

### 3. Run Schema
```bash
psql memory_os < src/db/schema.sql
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your settings
```

### 5. Start Development Server
```bash
npm run dev
```

Server will start at http://localhost:3000

## API Endpoints

- **Health Check**: `GET /health`
- **API Documentation**: `GET /docs`  
- **Create Memory**: `POST /api/v1/memory`
- **List Memories**: `GET /api/v1/memory`
- **Get Memory**: `GET /api/v1/memory/:id`
- **Correct Memory**: `POST /api/v1/memory/:id/correct`
- **Category Stats**: `GET /api/v1/memory/stats/categories`

## Test It

```bash
# Health check
curl http://localhost:3000/health

# Create a test memory
curl -X POST http://localhost:3000/api/v1/memory \
  -H "Content-Type: application/json" \
  -d '{
    "rawInput": "Did chest workout for 45 minutes",
    "eventType": "activity",
    "category": "fitness",
    "normalizedData": {
      "activity": "chest workout",
      "duration_minutes": 45
    }
  }'

# List all memories
curl http://localhost:3000/api/v1/memory
```

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── controllers/     # Request handlers
│   │   ├── routes/          # Route definitions
│   │   └── middleware/      # Custom middleware
│   ├── models/              # Database models
│   ├── services/            # Business logic
│   ├── config/              # Configuration
│   └── db/                  # Database connection
└── package.json
```

## MVC Pattern

- **Models** (`src/models/`): Data layer, database queries
- **Views**: JSON responses (Fastify handles this)
- **Controllers** (`src/api/controllers/`): HTTP request/response logic
- **Services** (`src/services/`): Business logic layer
- **Routes** (`src/api/routes/`): URL mapping to controllers
