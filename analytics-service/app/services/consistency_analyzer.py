"""
Consistency Analysis Service
Calculates consistency scores, streaks, and engagement metrics
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Any
from sqlalchemy.orm import Session

class ConsistencyAnalyzer:
    """Analyzes user activity consistency and engagement"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_engagement_score(self, user_id: str) -> Dict[str, Any]:
        """
        Calculate overall engagement score (0-100) based on:
        - Recency (40% weight)
        - Frequency (30% weight)
        - Streak (20% weight)
        - Growth (10% weight)
        """
        # Get user activity data
        days_since_last = self._get_days_since_last_event(user_id)
        events_7d = self._get_event_count(user_id, days=7)
        events_30d = self._get_event_count(user_id, days=30)
        current_streak = self._get_current_streak(user_id)
        
        # Score components (0-100 each)
        recency_score = self._score_recency(days_since_last)
        frequency_score = self._score_frequency(events_7d)
        streak_score = self._score_streak(current_streak)
        growth_score = self._score_growth(events_7d, events_30d)
        
        # Weighted total
        engagement_score = (
            recency_score * 0.4 +
            frequency_score * 0.3 +
            streak_score * 0.2 +
            growth_score * 0.1
        )
        
        # Determine trend
        trend = self._determine_trend(engagement_score, days_since_last, events_7d, events_30d)
        
        # Assess risk
        risk_level = self._assess_risk(engagement_score, days_since_last)
        
        return {
            'engagement_score': round(engagement_score),
            'trend': trend,
            'risk_level': risk_level,
            'is_at_risk': days_since_last >= 3,
            'components': {
                'recency': round(recency_score),
                'frequency': round(frequency_score),
                'streak': round(streak_score),
                'growth': round(growth_score)
            },
            'stats': {
                'days_since_last': days_since_last,
                'events_7d': events_7d,
                'events_30d': events_30d,
                'current_streak': current_streak
            }
        }
    
    def calculate_category_consistency(self, user_id: str, category: str) -> Dict[str, Any]:
        """Calculate consistency for specific category"""
        from sqlalchemy import text
        
        query = text("""
            SELECT 
                metric_date,
                COUNT(*) as event_count,
                EXTRACT(HOUR FROM metric_time) as hour
            FROM metrics
            WHERE user_id = :user_id
              AND category = :category
              AND metric_date >= NOW() - INTERVAL '30 days'
            GROUP BY metric_date, EXTRACT(HOUR FROM metric_time)
            ORDER BY metric_date
        """)
        
        df = pd.read_sql(query, self.db.bind, params={'user_id': user_id, 'category': category})
        
        if df.empty:
            return {
                'consistency_score': 0,
                'has_data': False
            }
        
        # Calculate consistency metrics
        total_days = 30
        active_days = len(df['metric_date'].unique())
        frequency = active_days / total_days
        
        # Time consistency (std dev of hour)
        time_variance = df['hour'].std() if len(df) > 1 else 0
        time_consistency = max(0, 100 - (time_variance * 10))
        
        # Regularity (how evenly distributed)
        regularity = self._calculate_regularity(df)
        
        # Overall consistency score
        consistency_score = (
            frequency * 0.4 +
            (time_consistency / 100) * 0.3 +
            regularity * 0.3
        ) * 100
        
        return {
            'consistency_score': round(consistency_score),
            'active_days': active_days,
            'total_days': total_days,
            'frequency_rate': round(frequency * 100, 1),
            'time_consistency': round(time_consistency),
            'regularity': round(regularity * 100),
            'has_data': True
        }

        
        if df.empty:
            return {
                'consistency_score': 0,
                'has_data': False
            }
        
        # Calculate consistency metrics
        total_days = 30
        active_days = len(df['metric_date'].unique())
        frequency = active_days / total_days
        
        # Time consistency (std dev of hour)
        time_variance = df['hour'].std() if len(df) > 1 else 0
        time_consistency = max(0, 100 - (time_variance * 10))
        
        # Regularity (how evenly distributed)
        regularity = self._calculate_regularity(df)
        
        # Overall consistency score
        consistency_score = (
            frequency * 0.4 +
            (time_consistency / 100) * 0.3 +
            regularity * 0.3
        ) * 100
        
        return {
            'consistency_score': round(consistency_score),
            'active_days': active_days,
            'total_days': total_days,
            'frequency_rate': round(frequency * 100, 1),
            'time_consistency': round(time_consistency),
            'regularity': round(regularity * 100),
            'has_data': True
        }
    
    def detect_gaps(self, user_id: str, category: str = None) -> List[Dict[str, Any]]:
        """Detect gaps in activity (missed days/weeks)"""
        from sqlalchemy import text
        
        query = text("""
            SELECT DISTINCT metric_date
            FROM metrics
            WHERE user_id = :user_id
        """)
        params = {'user_id': user_id}
        
        if category:
            query = text("""
                SELECT DISTINCT metric_date
                FROM metrics
                WHERE user_id = :user_id AND category = :category
            """)
            params['category'] = category
        
        query_str = str(query) + " ORDER BY metric_date DESC LIMIT 90"
        df = pd.read_sql(text(query_str), self.db.bind, params=params)
        
        if df.empty:
            return []
        
        # Convert to dates
        dates = pd.to_datetime(df['metric_date']).dt.date
        
        # Find gaps
        gaps = []
        for i in range(len(dates) - 1):
            gap_days = (dates.iloc[i] - dates.iloc[i + 1]).days
            if gap_days > 1:
                gaps.append({
                    'start_date': str(dates.iloc[i + 1]),
                    'end_date': str(dates.iloc[i]),
                    'gap_days': gap_days - 1,
                    'severity': 'high' if gap_days > 7 else 'medium' if gap_days > 3 else 'low'
                })
        
        return gaps[:10]  # Return top 10 gaps
    
    # Helper methods
    
    def _get_days_since_last_event(self, user_id: str) -> int:
        """Get days since last activity"""
        from sqlalchemy import text
        
        query = text("""
            SELECT EXTRACT(days FROM (NOW() - MAX(metric_date)))::int as days
            FROM metrics
            WHERE user_id = :user_id
        """)
        result = self.db.execute(query, {'user_id': user_id}).fetchone()
        return result[0] if result and result[0] is not None else 999
    
    def _get_event_count(self, user_id: str, days: int) -> int:
        """Get event count for last N days"""
        from sqlalchemy import text
        
        query = text("""
            SELECT COUNT(*)
            FROM metrics
            WHERE user_id = :user_id
              AND metric_date >= NOW() - INTERVAL ':days days'
        """)
        result = self.db.execute(query, {'user_id': user_id, 'days': days}).fetchone()
        return result[0] if result else 0
    
    def _get_current_streak(self, user_id: str) -> int:
        """Calculate current logging streak"""
        from sqlalchemy import text
        
        query = text("""
            SELECT DISTINCT metric_date
            FROM metrics
            WHERE user_id = :user_id
            ORDER BY metric_date DESC
            LIMIT 90
        """)
        df = pd.read_sql(query, self.db.bind, params={'user_id': user_id})
        
        if df.empty:
            return 0
        
        dates = pd.to_datetime(df['metric_date']).dt.date
        today = datetime.now().date()
        
        # Check if logged today or yesterday
        if dates.iloc[0] not in [today, today - timedelta(days=1)]:
            return 0
        
        # Count consecutive days
        streak = 1
        for i in range(len(dates) - 1):
            if (dates.iloc[i] - dates.iloc[i + 1]).days == 1:
                streak += 1
            else:
                break
        
        return streak
    
    def _score_recency(self, days_since_last: int) -> float:
        """Score based on recency (40% weight)"""
        if days_since_last == 0:
            return 100
        elif days_since_last == 1:
            return 80
        elif days_since_last == 2:
            return 60
        elif days_since_last == 3:
            return 40
        elif days_since_last <= 7:
            return 20
        else:
            return 0
    
    def _score_frequency(self, events_last_7_days: int) -> float:
        """Score based on frequency (30% weight)"""
        if events_last_7_days >= 14:  # 2+ per day
            return 100
        elif events_last_7_days >= 7:  # 1 per day
            return 80
        elif events_last_7_days >= 4:  # Every other day
            return 60
        elif events_last_7_days >= 2:
            return 40
        elif events_last_7_days == 1:
            return 20
        else:
            return 0
    
    def _score_streak(self, current_streak: int) -> float:
        """Score based on streak (20% weight)"""
        if current_streak >= 21:  # Habit formed
            return 100
        elif current_streak >= 14:  # 2 weeks
            return 80
        elif current_streak >= 7:  # 1 week
            return 60
        elif current_streak >= 3:
            return 40
        elif current_streak >= 1:
            return 20
        else:
            return 0
    
    def _score_growth(self, events_7d: int, events_30d: int) -> float:
        """Score based on growth trend (10% weight)"""
        if events_30d == 0:
            return 0
        
        # Expected events in 7 days based on 30-day avg
        expected_7d = (events_30d / 30) * 7
        
        if events_7d > expected_7d * 1.2:  # 20% growth
            return 100
        elif events_7d > expected_7d:
            return 70
        elif events_7d >= expected_7d * 0.8:
            return 50
        else:
            return 20
    
    def _determine_trend(self, score: float, days_since_last: int, 
                         events_7d: int, events_30d: int) -> str:
        """Determine engagement trend"""
        if days_since_last >= 7:
            return 'inactive'
        elif days_since_last >= 3:
            return 'declining'
        elif score >= 70:
            return 'increasing'
        else:
            return 'stable'
    
    def _assess_risk(self, score: float, days_since_last: int) -> str:
        """Assess churn risk"""
        if days_since_last >= 14:
            return 'churned'
        elif days_since_last >= 7:
            return 'high'
        elif days_since_last >= 3:
            return 'medium'
        elif score < 40:
            return 'low'
        else:
            return 'none'
    
    def _calculate_regularity(self, df: pd.DataFrame) -> float:
        """Calculate regularity score (0-1)"""
        if len(df) < 2:
            return 0.5
        
        # Count events per day
        daily_counts = df.groupby('metric_date').size()
        
        # Low std dev = more regular
        std_dev = daily_counts.std()
        mean_count = daily_counts.mean()
        
        if mean_count == 0:
            return 0
        
        # Coefficient of variation (lower = more regular)
        cv = std_dev / mean_count
        
        # Convert to 0-1 score (lower CV = higher regularity)
        regularity = max(0, 1 - (cv / 2))
        
        return regularity
