from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from app.db.connection import get_db
from app.services.pattern_detector import PatternDetectionService

router = APIRouter()

@router.get("/patterns/{user_id}")
async def get_patterns(
    user_id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get all detected patterns for a user
    """
    try:
        service = PatternDetectionService(db)
        
        if category:
            patterns = {
                'frequency_patterns': service.detect_frequency_patterns(user_id, category),
                'time_patterns': [] 
            }
        else:
            patterns = service.detect_all_patterns(user_id)
        
        return {
            'success': True,
            'data': patterns
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patterns/{user_id}/frequency")
async def get_frequency_patterns(
    user_id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get frequency patterns only
    """
    try:
        service = PatternDetectionService(db)
        patterns = service.detect_frequency_patterns(user_id, category)
        
        return {
            'success': True,
            'data': patterns,
            'count': len(patterns)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patterns/{user_id}/time")
async def get_time_patterns(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get time-based patterns only
    """
    try:
        service = PatternDetectionService(db)
        patterns = service.detect_time_patterns(user_id)
        
        return {
            'success': True,
            'data': patterns,
            'count': len(patterns)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
