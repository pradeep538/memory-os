from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.connection import get_db
from app.services.consistency_analyzer import ConsistencyAnalyzer
from typing import Optional

router = APIRouter()

@router.get("/consistency/{user_id}")
async def get_user_consistency(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get overall engagement and consistency score for user"""
    try:
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
    db: Session = Depends(get_db)
):
    """Get consistency score for specific category"""
    try:
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
    db: Session = Depends(get_db)
):
    """Detect gaps in user activity"""
    try:
        analyzer = ConsistencyAnalyzer(db)
        gaps = analyzer.detect_gaps(user_id, category)
        
        return {
            'success': True,
            'data': gaps,
            'count': len(gaps)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
