# Testing & Deployment Guide

## Quick Start - Run Everything

```bash
cd /Users/geetag/Documents/koda/memory-os

# 1. Run automated setup (installs PostgreSQL, creates DB, configures environment)
./setup.sh

# 2. Add your Gemini API key
# Edit backend/.env and add: GEMINI_API_KEY=AIza...your_key

# 3. Start services (2 terminals)

# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Analytics
cd analytics-service && source venv/bin/activate && python main.py

# 4. Run tests (new terminal)
./run-tests.sh
```

---

## Manual Setup (if setup.sh doesn't work)

### 1. Install PostgreSQL

```bash
# Install via Homebrew
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Verify it's running
psql --version
```

### 2. Create Database

```bash
# Create database
createdb memory_os

# Apply schema
psql memory_os < backend/src/db/schema.sql

# Verify tables
psql memory_os -c "\dt"
# Should show 8 tables
```

### 3. Get Gemini API Key

```bash
# 1. Visit: https://makersuite.google.com/app/apikey
# 2. Click "Create API Key"
# 3. Copy the key (starts with "AIza...")
```

### 4. Configure Backend

```bash
cd backend

# Create .env from template
cp .env.example .env

# Edit .env and add your Gemini key
nano .env
# OR
code .env

# Install dependencies
npm install
```

### 5. Configure Analytics Service

```bash
cd analytics-service

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

---

## Running the Services

### Terminal 1: Node.js Backend

```bash
cd /Users/geetag/Documents/koda/memory-os/backend
npm run dev
```

**Expected Output:**
```
🧠 Memory OS Backend
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Server: http://0.0.0.0:3000
Health: http://localhost:3000/health
Docs:   http://localhost:3000/docs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 Registered modules: ['generic', 'routine', 'fitness', 'finance']
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
INFO:     Uvicorn running on http://0.0.0.0:8001
```

---

## Running Tests

### Automated Test Suite

```bash
# Make sure both services are running first!
./run-tests.sh
```

**Tests Included:**
✓ Backend health check  
✓ Analytics health check
✓ Modules loaded
✓ Text input (fitness, finance, routine)
✓ Memory management
✓ Insights generation
✓ Query engine
✓ Notifications

### Manual Testing

```bash
# 1. Health check
curl http://localhost:3000/health

# 2. Add a workout
curl -X POST http://localhost:3000/api/v1/input/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Did chest workout for 45 minutes"}'

# 3. Add an expense
curl -X POST http://localhost:3000/api/v1/input/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Paid 500 rupees for groceries"}'

# 4. List memories
curl http://localhost:3000/api/v1/memory

# 5. Ask a question
curl -X POST http://localhost:3000/api/v1/query \
  -H "Content-Type: application/json" \
  -d '{"question": "How many workouts this week?"}'

# 6. Get insights
curl http://localhost:3000/api/v1/insights

# 7. Check modules
curl http://localhost:3000/api/v1/modules
```

---

## Troubleshooting

### PostgreSQL Issues

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL
brew services start postgresql@15

# Check database exists
psql -l | grep memory_os
```

### Gemini API Issues

```bash
# Verify API key in .env
cat backend/.env | grep GEMINI_API_KEY

# Test Gemini directly (replace with your key)
curl https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=YOUR_API_KEY \
  -H 'Content-Type: application/json' \
  -d '{"contents":[{"parts":[{"text":"Say hello"}]}]}'
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port in .env
PORT=3001
```

---

## What to Expect

### After Setup:
✅ PostgreSQL running with `memory_os` database
✅ 8 tables created (users, memory_units, entities, patterns, etc.)
✅ Backend running on port 3000
✅ Analytics running on port 8001
✅ Demo user created (UUID: 00000000-0000-0000-0000-000000000000)

### After First Inputs:
✅ Memories stored in database
✅ Category modules process each memory
✅ Patterns detected (after 3+ similar memories)
✅ Insights generated
✅ Notifications created

### Working Features:
✅ Text input with Gemini understanding
✅ Memory CRUD operations
✅ Category module processing (Generic, Routine, Fitness, Finance)
✅ Pattern detection (Python analytics)
✅ Natural language insights
✅ Query engine ("Ask anything")
✅ Scheduled notifications

---

## Next Steps After Testing

Once all tests pass:

1. **Create Demo/Walkthrough** - Record video showing features
2. **Build Flutter Frontend** - Most user-facing impact
3. **Add Remaining Modules** - Mindfulness, Health
4. **Deploy** - Consider hosting options

---

**Ready to test!** Run `./setup.sh` to begin.
