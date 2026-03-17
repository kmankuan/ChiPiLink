from typing import List, Optional, Dict, Any
from ..models.live_session import Point, ScoreState
from datetime import datetime

def detect_emotions(points: List[Point], current_score: ScoreState, settings: Dict[str, Any]) -> List[str]:
    """Detect emotions based on current game state
    
    Args:
        points: List of points in current set
        current_score: Current score state
        settings: Game settings (points_to_win, etc.)
        
    Returns:
        List of emotion strings that should be triggered
    """
    if not points:
        return []
    
    emotions = []
    last_point = points[-1]
    points_to_win = settings.get("points_to_win", 11)
    
    # Check for streaks
    streak_length = calculate_current_streak(points, last_point.scored_by)
    
    if streak_length >= 5:
        emotions.append("streak_5")
    elif streak_length >= 3:
        emotions.append("streak_3")
    
    # Check for streak break (opponent had a streak and we just scored)
    opponent = "b" if last_point.scored_by == "a" else "a"
    opponent_streak = calculate_current_streak(points[:-1], opponent)  # Check streak before this point
    if opponent_streak >= 3:
        emotions.append("streak_break")
    
    # Check for deuce situation (both at points_to_win - 1 or higher and tied)
    if (current_score.a >= points_to_win - 1 and current_score.b >= points_to_win - 1 and 
        current_score.a == current_score.b):
        emotions.append("deuce")
    
    # Check for match point
    if is_match_point(current_score, points_to_win):
        emotions.append("match_point")
    
    # Check for comeback (player was behind by 5+ and now ahead or tied)
    if is_comeback_situation(points, current_score):
        emotions.append("comeback")
    
    # Check for perfect set (11-0 or similar)
    if is_perfect_set(current_score, points_to_win):
        emotions.append("perfect_set")
    
    return emotions

def calculate_current_streak(points: List[Point], player: str) -> int:
    """Calculate current scoring streak for a player"""
    if not points:
        return 0
    
    streak = 0
    for point in reversed(points):
        if point.scored_by == player:
            streak += 1
        else:
            break
    
    return streak

def is_match_point(score: ScoreState, points_to_win: int, min_lead: int = 2) -> bool:
    """Check if current situation is match point for either player"""
    # Player A match point
    if score.a >= points_to_win - 1 and score.a >= score.b + min_lead - 1:
        return True
    
    # Player B match point  
    if score.b >= points_to_win - 1 and score.b >= score.a + min_lead - 1:
        return True
    
    return False

def is_comeback_situation(points: List[Point], current_score: ScoreState) -> bool:
    """Check if current situation represents a comeback"""
    if len(points) < 10:  # Need enough points to establish a deficit
        return False
    
    # Look at score 5-7 points ago to see if there was a significant deficit
    check_points = [5, 6, 7]
    
    for check_point in check_points:
        if len(points) >= check_point:
            past_index = len(points) - check_point
            past_score = points[past_index].score_after
            
            # Check if player A was behind by 5+ and is now ahead or tied
            if (past_score.a <= past_score.b - 5 and current_score.a >= current_score.b):
                return True
            
            # Check if player B was behind by 5+ and is now ahead or tied
            if (past_score.b <= past_score.a - 5 and current_score.b >= current_score.a):
                return True
    
    return False

def is_perfect_set(score: ScoreState, points_to_win: int) -> bool:
    """Check if one player won with a perfect score (opponent scored 0)"""
    return (score.a >= points_to_win and score.b == 0) or (score.b >= points_to_win and score.a == 0)

def calculate_momentum(points: List[Point], player: str, window_size: int = 5) -> float:
    """Calculate momentum for a player based on recent points
    
    Args:
        points: List of points
        player: Player to calculate momentum for ("a" or "b")
        window_size: Number of recent points to consider
        
    Returns:
        Momentum value between -1.0 and 1.0
    """
    if len(points) < 2:
        return 0.0
    
    # Get recent points
    recent_points = points[-window_size:] if len(points) >= window_size else points
    
    # Count points scored by this player vs opponent
    player_points = sum(1 for p in recent_points if p.scored_by == player)
    total_points = len(recent_points)
    
    if total_points == 0:
        return 0.0
    
    # Calculate momentum as a ratio, then scale to -1 to 1
    ratio = player_points / total_points
    momentum = (ratio - 0.5) * 2  # Scale from 0-1 to -1 to 1
    
    return max(-1.0, min(1.0, momentum))

def should_change_server(points: List[Point], current_server: str, settings: Dict[str, Any]) -> tuple[bool, str]:
    """Determine if server should change and who the new server should be
    
    Args:
        points: List of points in current set
        current_server: Current serving player ("a" or "b")
        settings: Game settings
        
    Returns:
        Tuple of (should_change, new_server)
    """
    if not settings.get("auto_service_tracking", True):
        return False, current_server
    
    service_change_every = settings.get("service_change_every", 2)
    service_change_at_deuce = settings.get("service_change_at_deuce", 1)
    points_to_win = settings.get("points_to_win", 11)
    
    if not points:
        return False, current_server
    
    last_point = points[-1]
    current_score = last_point.score_after
    
    # Check if we're in deuce situation (both at points_to_win - 1 or higher)
    is_deuce = (current_score.a >= points_to_win - 1 and current_score.b >= points_to_win - 1)
    
    if is_deuce:
        # In deuce, service changes every point or every 2 points based on settings
        total_points_since_deuce = len([p for p in points if 
                                       p.score_after.a >= points_to_win - 1 and 
                                       p.score_after.b >= points_to_win - 1])
        
        if service_change_at_deuce == 1:
            # Change every point in deuce
            return True, "b" if current_server == "a" else "a"
        else:
            # Change every 2 points in deuce
            if total_points_since_deuce % service_change_at_deuce == 0:
                return True, "b" if current_server == "a" else "a"
    else:
        # Normal play - change every N points
        total_points = len(points)
        if total_points % service_change_every == 0:
            return True, "b" if current_server == "a" else "a"
    
    return False, current_server
