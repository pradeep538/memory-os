# Memory OS - Setup & Testing Guide

## Current Status

✅ **Code Written:** All integrations are coded
⚠️ **Not Tested:** Database and LLM need actual setup

## Prerequisites

Before testing, you need:

1. **PostgreSQL 15+** installed
2. **Node.js 18+** installed
3. **Python 3.10+** installed
4. **Gemini API Key** (from Google AI Studio)
5. **Google Cloud credentials** (optional, for voice)

---

## Step-by-Step Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb memory_os

# Verify it was created
psql -l | grep memory_os

# Run schema to create tables
psql memory_os < /Users/geetag/Documents/koda/memory-os/backend/src/db/schema.sql

# Verify tables were created
psql memory_os -c "\dt"
# Should show: users, memory_units, entities, patterns, plans, sessions, notifications, usage_tracking
```

**Expected Output:**
```
                List of relations
 Schema |       Name        | Type  |  Owner  
--------+-------------------+-------+---------
 public | entities          | table | geetag
 public | memory_units      | table | geetag
 public | notifications     | table | geetag
 public | patterns          | table | geetag
 public | plans             | table | geetag
 public | sessions          | table | geetag
 public | usage_tracking    | table | geetag
 public | users             | table | geetag
```

### 2. Get Gemini API Key

```bash
# 1. Go to: https://makersuite.google.com/app/apikey
# 2. Click "Create API Key"
# 3. Copy the key (starts with "AIza...")
# 4. Save it for next step
```

### 3. Backend Configuration

```bash
cd /Users/geetag/Documents/koda/memory-os/backend

# Copy environment template
cp .env.example .env

# Edit .env and add your Gemini API key
nano .env
# or
code .env
```

**Required in .env:**
```bash
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://localhost:5432/memory_os

# Gemini API (REQUIRED)
GEMINI_API_KEY=AIzaSy...your_key_here
GEMINI_MODEL=gemini-1.5-flash-latest

# Analytics Service
ANALYTICS_SERVICE_URL=http://localhost:8001

#Optional: Google Speech-to-Text (for voice input)
# GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
# Or just use text input for now
```

### 4. Install Dependencies

```bash
# Backend (Node.js)
cd /Users/geetag/Documents/koda/memory-os/backend
npm install

# Analytics (Python)
cd /Users/geetag/Documents/koda/memory-os/analytics-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 5. Verify Database Connection

```bash
# Test database connection
cd /Users/geetag/Documents/koda/memory-os/backend

# Quick test with Node.js
node -e "
import('pg').then(({ default: pg }) => {
  const pool = new pg.Pool({
    connectionString: 'postgresql://localhost:5432/memory_os'
  });
  
  pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('❌ Database connection failed:', err.message);
    } else {
      console.log('✅ Database connected:', res.rows[0].now);
    }
    pool.end();
  });
});
"
```

**Expected Output:**
```
✅ Database connected: 2026-01-14T01:50:22.123Z
```

### 6. Verify Gemini API

```bash
# Test Gemini API key
node -e "
import('@google/generative-ai').then(({ GoogleGenerativeAI }) => {
  const genAI = new GoogleGenerativeAI('YOUR_GEMINI_KEY_HERE');
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });
  
  model.generateContent('Say hello').then(result => {
    console.log('✅ Gemini API working:', result.response.text());
  }).catch(err => {
    console.error('❌ Gemini API failed:', err.message);
  });
});
"
```

**Expected Output:**
```
✅ Gemini API working: Hello! 👋
```

---

## Starting the Services

### Terminal 1: Node.js Backend

```bash
cd /Users/geetag/Documents/koda/memory-os/backend
npm run dev
```

**Expected Output:**
```
🧠 Memory OS Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Environment: development
Server:      http://0.0.0.0:3000
Health:      http://localhost:3000/health
Docs:        http://localhost:3000/docs
API:         http://localhost:3000/api/v1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Registered modules: ['generic', 'routine', 'fitness', 'finance']
  ✓ Registered: Generic (generic)
  ✓ Registered: Routine & Maintenance (routine)
  ✓ Registered: Fitness & Workouts (fitness)
  ✓ Registered: Finance & Money (finance)

🕐 Starting scheduled jobs...
  ✓ Weekly insights scheduled (Sundays 8 AM)
  ✓ Daily summary scheduled (11 PM)
✅ Scheduled jobs started
```

### Terminal 2: Python Analytics Service

```bash
cd /Users/geetag/Documents/koda/memory-os/analytics-service
source venv/bin/activate
python main.py
```

**Expected Output:**
```
INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

---

## Quick Health Checks

```bash
# 1. Backend health
curl http://localhost:3000/health
# Expected: {"status":"healthy","service":"memory-os-backend","database":"connected",...}

# 2. Python analytics health
curl http://localhost:8001/health
# Expected: {"status":"healthy","service":"analytics-service","version":"1.0.0"}

# 3. Check registered modules
curl http://localhost:3000/api/v1/modules
# Expected: List of 4 modules (generic, routine, fitness, finance)

# 4. Check Swagger docs
open http://localhost:3000/docs
# Should show full API documentation
```

---

## Integration Verification Checklist

### Database Integration
- [ ] PostgreSQL installed
- [ ] Database `memory_os` created
- [ ] Schema applied (8 tables)
- [ ] Node.js can connect
- [ ] Python can connect
- [ ] Demo user exists (from schema.sql)

### LLM Integration (Gemini)
- [ ] API key obtained
- [ ] Added to `.env`
- [ ] `@google/generative-ai` package installed
- [ ] Can generate text
- [ ] Used in: llmService, inputService, insightsService, questionGeneratorService, queryEngineService

### Optional: Google Speech-to-Text
- [ ] Service account JSON downloaded
- [ ] Path added to `.env`
- [ ] `@google-cloud/speech` package installed
- [ ] Can transcribe audio

---

## Common Issues & Fixes

### Issue: "Cannot find module 'pg'"
```bash
cd backend
npm install
```

### Issue: "Database connection failed"
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep memory_os

# Check connection string in .env
cat .env | grep DATABASE_URL
```

### Issue: "Gemini API failed: API key not valid"
```bash
# Verify API key in .env
cat .env | grep GEMINI_API_KEY

# Make sure there are no quotes around the key
# Wrong: GEMINI_API_KEY="AIza..."
# Right: GEMINI_API_KEY=AIza...
```

### Issue: "ModuleRegistry: Module must extend CategoryModule"
```bash
# This means a module import failed
# Check that all module files exist:
ls -la backend/src/modules/*/
```

---

## Next Steps After Setup

Once both services are running and health checks pass:

1. **Run Test Suite** (I'll create this next)
2. **Test Text Input**
3. **Test Insights Generation**
4. **Test Query Engine**
5. **Test Scheduled Jobs**

Ready to proceed with actual testing once setup is done!
