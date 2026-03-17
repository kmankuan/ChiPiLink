import math
from typing import Tuple

def calculate_elo_changes(rating_a: int, rating_b: int, winner_is_a: bool, k_factor: int = 32) -> Tuple[int, int]:
    """Calculate ELO rating changes for both players
    
    Args:
        rating_a: Current ELO rating of player A
        rating_b: Current ELO rating of player B  
        winner_is_a: True if player A won, False if player B won
        k_factor: K-factor for ELO calculation (default 32)
        
    Returns:
        Tuple of (change_a, change_b) - positive means rating increase
    """
    # Calculate expected scores
    expected_a = 1 / (1 + math.pow(10, (rating_b - rating_a) / 400))
    expected_b = 1 - expected_a
    
    # Actual scores (1 for win, 0 for loss)
    actual_a = 1 if winner_is_a else 0
    actual_b = 1 - actual_a
    
    # Calculate rating changes
    change_a = round(k_factor * (actual_a - expected_a))
    change_b = round(k_factor * (actual_b - expected_b))
    
    return change_a, change_b

def calculate_win_probability(rating_a: int, rating_b: int) -> Tuple[float, float]:
    """Calculate win probabilities for both players
    
    Args:
        rating_a: ELO rating of player A
        rating_b: ELO rating of player B
        
    Returns:
        Tuple of (prob_a, prob_b) - probabilities that each player wins
    """
    prob_a = 1 / (1 + math.pow(10, (rating_b - rating_a) / 400))
    prob_b = 1 - prob_a
    return prob_a, prob_b
