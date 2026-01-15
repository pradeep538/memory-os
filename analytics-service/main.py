from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
from app.api.routes import patterns, consistency

app = FastAPI(
    title="Memory OS Analytics Service",
    description="Statistical analysis and pattern detection for Memory OS",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "analytics-service",
        "version": "1.0.0"
    }

# Register routers
app.include_router(patterns.router, prefix="/api/v1", tags=["patterns"])
app.include_router(consistency.router, prefix="/api/v1", tags=["consistency"])

@app.get("/")
async def root():
    return {
        "message": "Memory OS Analytics Service",
        "docs": "/docs",
        "endpoints": {
            "health": "/health",
            "patterns": "/api/v1/patterns/{user_id}",
            "consistency": "/api/v1/consistency/{user_id}"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development"
    )
