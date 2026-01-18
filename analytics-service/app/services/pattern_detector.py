import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session

class PatternDetectionService:
    """
    Service for detecting patterns in user memory data
    Uses statistical methods with pandas/numpy
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def detect_frequency_patterns(self, user_id: str, category: str = None) -> List[Dict[str, Any]]:
        """
        Detect frequency patterns: "You usually X times per week"
        """
        # Query memory units
        query = """
            SELECT 
                normalized_data->>'activity' as activity,
                category,
                DATE(created_at) as date,
                COUNT(*) as count
            FROM memory_units
            WHERE user_id = %(user_id)s
                AND status = 'validated'
                AND created_at >= NOW() - INTERVAL '30 days'
        """
        
        params = {"user_id": user_id}
        
        if category:
            query += " AND category = %(category)s"
            params["category"] = category
        
        query += " GROUP BY activity, category, DATE(created_at)"
        
        # Execute and load into pandas
        df = pd.read_sql(query, self.db.bind, params=params)
        
        if df.empty:
            return []
        
        patterns = []
        
        # Group by activity
        for activity, group in df.groupby(['activity', 'category']):
            if len(group) < 3:  # Need at least 3 occurrences
                continue
            
            activity_name, cat = activity
            
            # Calculate frequency
            days_span = (group['date'].max() - group['date'].min()).days + 1
            total_count = group['count'].sum()
            
            if days_span < 7:  # Too short to determine pattern
                continue
            
            # Calculate per-week frequency
            weeks = days_span / 7
            per_week = total_count / weeks
            
            # Check if regular (std dev check)
            daily_counts = group.groupby('date')['count'].sum()
            regularity = 1 - (daily_counts.std() / (daily_counts.mean() + 1))  # Normalized regularity
            
            if per_week >= 1 and regularity > 0.3:  # At least weekly and somewhat regular
                patterns.append({
                    'pattern_type': 'frequency',
                    'category': cat,
                    'activity': activity_name,
                    'frequency_per_week': round(per_week, 1),
                    'regularity_score': round(regularity, 2),
                    'confidence': round(min(regularity, total_count / 10), 2),
                    'description': f"You {activity_name} {round(per_week, 1)}x per week on average",
                    'evidence': {
                        'sample_size': int(total_count),
                        'days_spanned': int(days_span),
                        'frequency': round(per_week, 2),
                        'regularity': round(regularity, 2)
                    }
                })
        
        return sorted(patterns, key=lambda x: x['confidence'], reverse=True)
    
    def detect_time_patterns(self, user_id: str) -> List[Dict[str, Any]]:
        """
        Detect time-based patterns: "You usually meditate at 6 AM"
        """
        query = """
            SELECT 
                normalized_data->>'activity' as activity,
                category,
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as count
            FROM memory_units
            WHERE user_id = %(user_id)s
                AND status = 'validated'
                AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY activity, category, hour
            HAVING COUNT(*) >= 3
        """
        
        df = pd.read_sql(query, self.db.bind, params={"user_id": user_id})
        
        if df.empty:
            return []
        
        patterns = []
        
        for (activity, category), group in df.groupby(['activity', 'category']):
            # Find peak hour
            peak_hour = group.loc[group['count'].idxmax(), 'hour']
            peak_count = group.loc[group['count'].idxmax(), 'count']
            total_count = group['count'].sum()
            
            # Calculate concentration (how much activity happens at peak hour)
            concentration = peak_count / total_count
            
            # Format time for human readability (Midnight/Noon handling)
            hour_int = int(peak_hour)
            if hour_int == 0:
                time_str = "Midnight"
            elif hour_int == 12:
                time_str = "Noon"
            else:
                time_str = datetime.strptime(str(hour_int), '%H').strftime('%I %p').lstrip('0')

            if concentration > 0.5 and peak_count >= 3:  # More than half at this hour
                patterns.append({
                    'pattern_type': 'time_preference',
                    'category': category,
                    'activity': activity,
                    'peak_hour': hour_int,
                    'concentration': round(concentration, 2),
                    'confidence': round(min(concentration, peak_count / 10), 2),
                    'description': f"You usually {activity} around {time_str}",
                    'evidence': {
                        'sample_size': int(total_count),
                        'peak_count': int(peak_count),
                        'concentration': round(concentration, 2),
                        'peak_hour': hour_int
                    }
                })
        
        return sorted(patterns, key=lambda x: x['confidence'], reverse=True)
    
    def detect_all_patterns(self, user_id: str) -> Dict[str, List[Dict[str, Any]]]:
        """
        Detect all types of patterns for a user
        """
        return {
            'frequency_patterns': self.detect_frequency_patterns(user_id),
            'time_patterns': self.detect_time_patterns(user_id)
        }
