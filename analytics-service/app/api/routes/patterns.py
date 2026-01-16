from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import os
from app.db.connection import get_db
from app.services.pattern_detector import PatternDetectionService
from app.auth import get_current_user, verify_user_access

router = APIRouter()

@router.get("/patterns/{user_id}")
async def get_patterns(
    user_id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Get all detected patterns for a user
    Requires authentication - users can only access their own patterns
    """
    try:
        # Verify user can access this data
        is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
        verify_user_access(current_user, user_id, is_dev)
        
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
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Get frequency patterns only
    Requires authentication
    """
    try:
        # Verify user access
        is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
        verify_user_access(current_user, user_id, is_dev)
        
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
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """
    Get time-based patterns only
    Requires authentication
    """
    try:
        # Verify user access
        is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
        verify_user_access(current_user, user_id, is_dev)
        
        service = PatternDetectionService(db)
        patterns = service.detect_time_patterns(user_id)
        
        return {
            'success': True,
            'data': patterns,
            'count': len(patterns)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
