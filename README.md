# Memory OS - Complete System Overview

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Flutter Frontend                        │
│                    (Mobile App - TBD)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ REST API
                       ▼
┌───────────────────────────────────────────────────────────────┐
│            Node.js Backend (Port 3000)                        │
├───────────────────────────────────────────────────────────────┤
│  ✅ Text Input (/api/v1/input/text)                           │
│  ✅ Voice Input (/api/v1/input/voice) - Freemium              │
│  ✅ Memory CRUD (/api/v1/memory)                              │
│  ✅ LLM Understanding (Gemini Flash)                          │
│  ✅ Google Speech-to-Text V2                                  │
│  ⏳ Query Engine (Strategy 2)                                 │
│  ⏳ Category Modules                                           │
└──────────────┬────────────────────────────┬───────────────────┘
               │                            │
               │ Internal API               │ Shared DB
               ▼                            ▼
┌────────────────────────────────┐  ┌──────────────────────┐
│  Python Analytics (Port 8001)  │  │   PostgreSQL         │
├────────────────────────────────┤  ├──────────────────────┤
│  ✅ Pattern Detection          │  │  8 Tables:           │
│  ✅ Frequency Analysis         │  │  - users             │
│  ✅ Time Patterns              │  │  - memory_units      │
│  ⏳ Correlation Engine          │  │  - entities          │
│  ⏳ Trend Analysis              │  │  - patterns          │
│  ⏳ Anomaly Detection           │  │  - plans             │
│  ⏳ Forecasting                 │  │  - sessions          │
└────────────────────────────────┘  │  - notifications     │
                                    │  - usage_tracking    │
                                    └──────────────────────┘
```

## Services

### 1. Node.js Backend (Fastify)
**Status**: ✅ Running  
**Port**: 3000  
**Location**: `/memory-os/backend/`

**What's Built:**
- ✅ Database schema (8 tables)
- ✅ Text input processing
- ✅ Voice input (Google Speech-to-Text V2)
- ✅ LLM understanding (Gemini Flash)
- ✅ Memory CRUD API
- ✅ Usage tracking (freemium limits)
- ✅ MVC architecture (Models, Services, Controllers, Routes)
- ✅ Swagger documentation at `/docs`

**To Run:**
```bash
cd backend
npm install
cp .env.example .env
# Add your GEMINI_API_KEY and GOOGLE_CLOUD credentials
npm run dev
```

### 2. Python Analytics Service (FastAPI)
**Status**: ✅ Built, Not Running Yet  
**Port**: 8001  
**Location**: `/memory-os/analytics-service/`

**What's Built:**
- ✅ Pattern detection (frequency, time-based)
- ✅ Statistical analysis with pandas/numpy
- ⏳ Correlation detection (TODO)
- ⏳ Trend analysis (TODO)
- ⏳ Anomaly detection (TODO)

**To Run:**
```bash
cd analytics-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

### 3. PostgreSQL Database
**Status**: ✅ Schema Created  
**Port**: 5432  
**Database**: `memory_os`

**To Setup:**
```bash
createdb memory_os
psql memory_os < backend/src/db/schema.sql
```

---

## Features Implemented

### ✅ Input Capture
- **Text Input**: Unlimited for all users
- **Voice Input**: 
  - Free: 5 inputs/day (6 seconds each)
  - Pro: Unlimited
  - Uses Google Cloud Speech-to-Text V2
  - Supports English, Hindi, Indian English

### ✅ LLM Understanding
- **Gemini Flash** for intent classification
- Extracts:
  - Event type (activity, transaction, routine, health, note)
  - Category (fitness, finance, mindfulness, routine, health, generic)
  - Entities (activity, amount, duration, person, item)
  - Confidence score
- Fallback logic if LLM fails

### ✅ Memory Storage
- Immutable event log
- Confidence scoring
- Status tracking (tentative, validated, corrected)
- Correction tracking
- Source tracking (text, voice, api, session)

### ✅ Pattern Detection (Python)
- **Frequency Patterns**: "You usually X times per week"
- **Time Patterns**: "You usually meditate at 6 AM"
- Statistical significance testing
- Confidence scoring

---

## API Endpoints

### Node.js Backend (Port 3000)

**Input:**
- `POST /api/v1/input/text` - Process text input
- `POST /api/v1/input/voice` - Upload & transcribe voice
- `GET /api/v1/input/voice/quota` - Check voice quota

**Memory:**
- `POST /api/v1/memory` - Create memory manually
- `GET /api/v1/memory` - List memories (with filters)
- `GET /api/v1/memory/:id` - Get single memory
- `POST /api/v1/memory/:id/correct` - Correct a memory
- `GET /api/v1/memory/stats/categories` - Category statistics

**System:**
- `GET /health` - Health check
- `GET /docs` - Swagger documentation
- `GET /api/v1` - API info

### Python Analytics (Port 8001)

**Patterns:**
- `GET /api/v1/patterns/{user_id}` - All patterns
- `GET /api/v1/patterns/{user_id}/frequency` - Frequency patterns
- `GET /api/v1/patterns/{user_id}/time` - Time-based patterns

**System:**
- `GET /health` - Health check
- `GET /docs` - API documentation

---

## Quick Start

### 1. Setup Database
```bash
createdb memory_os
psql memory_os < backend/src/db/schema.sql
```

### 2. Start Node.js Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: Add GEMINI_API_KEY
npm run dev
```

### 3. Start Python Analytics (Optional)
```bash
cd analytics-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

### 4. Test It
```bash
# Text input
curl -X POST http://localhost:3000/api/v1/input/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Did chest workout for 45 minutes"}'

# Get patterns (after some data)
curl http://localhost:8001/api/v1/patterns/00000000-0000-0000-0000-000000000000
```

---

## Project Structure

```
memory-os/
├── backend/                    # Node.js Fastify backend
│   ├── src/
│   │   ├── api/               # Controllers & Routes
│   │   ├── models/            # Database models
│   │   ├── services/          # Business logic
│   │   ├── config/            # Configuration
│   │   └── db/                # Database connection
│   ├── package.json
│   └── .env.example
│
├── analytics-service/          # Python FastAPI analytics
│   ├── app/
│   │   ├── api/routes/        # API routes  
│   │   ├── services/          # Analytics services
│   │   └── db/                # Database connection
│   ├── config/                # Settings
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # Flutter (TBD)
│
└── README.md                   # This file
```

---

## Next Steps

1. ⏳ **Query Engine** (Node.js) - Safe query builder (Strategy 2)
2. ⏳ **Category Modules** - Fitness, finance, routine, mindfulness
3. ⏳ **Correlation Engine** (Python) - Cross-domain insights
4. ⏳ **Plan Generator** - Intelligent plan creation
5. ⏳ **Guided Sessions** - Meditation, mantra, yoga controllers
6. ⏳ **Flutter Frontend** - Mobile app with universal widgets

---

## Development Guidelines

- **Node.js**: Use MVC pattern (Models, Views, Controllers)
- **Python**: Use services pattern with pandas/scipy
- **Database**: All services share PostgreSQL
- **API**: RESTful with clear documentation
- **Freemium**: Free tier limits enforced at service layer

---

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Backend API | Node.js + Fastify |
| Analytics | Python + FastAPI |
| Database | PostgreSQL 15+ |
| LLM | Google Gemini Flash |
| Voice | Google Cloud Speech-to-Text V2 |
| Data Science | pandas, numpy, scipy, scikit-learn |
| Frontend | Flutter (TBD) |
