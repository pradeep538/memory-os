from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import os
from app.db.connection import get_db
from app.services.consistency_analyzer import ConsistencyAnalyzer
from app.auth import get_current_user, verify_user_access
from typing import Optional

router = APIRouter()

@router.get("/consistency/{user_id}")
async def get_user_consistency(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get overall engagement and consistency score for user (requires auth)"""
    try:
        is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
        verify_user_access(current_user, user_id, is_dev)
        
        analyzer = ConsistencyAnalyzer(db)
        score = analyzer.calculate_engagement_score(user_id)
        
        return {
            'success': True,
            'data': score
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/consistency/{user_id}/category/{category}")
async def get_category_consistency(
    user_id: str,
    category: str,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get consistency score for specific category (requires auth)"""
    try:
        is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
        verify_user_access(current_user, user_id, is_dev)
        
        analyzer = ConsistencyAnalyzer(db)
        score = analyzer.calculate_category_consistency(user_id, category)
        
        return {
            'success': True,
            'data': score
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/consistency/{user_id}/gaps")
async def get_activity_gaps(
    user_id: str,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Detect gaps in user activity (requires auth)"""
    try:
        is_dev = os.getenv('ENVIRONMENT', 'development') == 'development'
        verify_user_access(current_user, user_id, is_dev)
        
        analyzer = ConsistencyAnalyzer(db)
        gaps = analyzer.detect_gaps(user_id, category)
        
        return {
            'success': True,
            'data': gaps,
            'count': len(gaps)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
