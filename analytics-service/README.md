# Memory OS Analytics Service

Python-based analytics and pattern detection service for Memory OS.

## Features

- **Pattern Detection**: Frequency and time-based patterns
- **Statistical Analysis**: Using pandas, numpy, scipy
- **Correlation Detection**: Cross-domain correlations
- **Trend Analysis**: Time series analysis with statsmodels
- **Anomaly Detection**: Using scikit-learn

## Setup

### 1. Create Virtual Environment
```bash
cd analytics-service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
cp .env.example .env
# Edit .env with your database URL
```

### 4. Run Server
```bash
# Development
python main.py

# Or with uvicorn directly
uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

## API Endpoints

- **Health**: `GET /health`
- **Docs**: `GET /docs`
- **All Patterns**: `GET /api/v1/patterns/{user_id}`
- **Frequency Patterns**: `GET /api/v1/patterns/{user_id}/frequency`
- **Time Patterns**: `GET /api/v1/patterns/{user_id}/time`

## Example Usage

```bash
# Get all patterns for a user
curl http://localhost:8001/api/v1/patterns/00000000-0000-0000-0000-000000000000

# Get frequency patterns for fitness category
curl http://localhost:8001/api/v1/patterns/00000000-0000-0000-0000-000000000000/frequency?category=fitness
```

## Integration with Node.js Backend

The Node.js backend can call the analytics service:

```javascript
// In Node.js backend
const response = await fetch('http://localhost:8001/api/v1/patterns/${userId}');
const patterns = await response.json();
```

## Tech Stack

- **FastAPI**: Web framework
- **pandas**: Data manipulation
- **numpy**: Numerical computing
- **scipy**: Statistical analysis
- **scikit-learn**: Machine learning & anomaly detection
- **statsmodels**: Time series analysis
- **SQLAlchemy**: Database ORM
- **PostgreSQL**: Shared database with Node.js backend
