from typing import List, Dict, Any, Optional
from models.tournament import TournamentBracket, TournamentMatch
from models.player import PlayerSimple
import uuid
import math

def generate_single_elimination_brackets(participants: List[PlayerSimple], third_place_match: bool = True) -> List[TournamentBracket]:
    """Generate single elimination tournament brackets
    
    Args:
        participants: List of tournament participants (should be sorted by seed)
        third_place_match: Whether to include a third place match
        
    Returns:
        List of tournament brackets with matches
    """
    num_participants = len(participants)
    if num_participants < 2:
        return []
    
    # Calculate number of rounds needed
    num_rounds = math.ceil(math.log2(num_participants))
    
    # Pad participants to next power of 2 if needed
    next_power_of_2 = 2 ** num_rounds
    padded_participants = participants + [None] * (next_power_of_2 - num_participants)
    
    brackets = []
    
    # Generate first round
    first_round_matches = []
    round_names = get_round_names(num_rounds, third_place_match)
    
    # Pair participants using standard tournament seeding
    pairings = generate_seeded_pairings(padded_participants)
    
    for i, (player_a, player_b) in enumerate(pairings):
        match = TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:10]}",
            round=1,
            position=i + 1,
            player_a=player_a,
            player_b=player_b,
            status="pending"
        )
        first_round_matches.append(match)
    
    brackets.append(TournamentBracket(
        round=1,
        name=round_names[0],
        matches=first_round_matches
    ))
    
    # Generate subsequent rounds (empty initially)
    for round_num in range(2, num_rounds + 1):
        num_matches = 2 ** (num_rounds - round_num)
        matches = []
        
        for i in range(num_matches):
            match = TournamentMatch(
                match_id=f"tm_{uuid.uuid4().hex[:10]}",
                round=round_num,
                position=i + 1,
                status="pending"
            )
            matches.append(match)
        
        brackets.append(TournamentBracket(
            round=round_num,
            name=round_names[round_num - 1],
            matches=matches
        ))
    
    # Add third place match if enabled
    if third_place_match and num_rounds > 1:
        third_place_match_obj = TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:10]}",
            round=num_rounds + 1,
            position=1,
            status="pending"
        )
        
        brackets.append(TournamentBracket(
            round=num_rounds + 1,
            name="Third Place",
            matches=[third_place_match_obj]
        ))
    
    return brackets

def generate_seeded_pairings(participants: List[Optional[PlayerSimple]]) -> List[tuple]:
    """Generate tournament pairings using standard seeding
    
    For 8 players: 1v8, 4v5, 2v7, 3v6
    For 4 players: 1v4, 2v3
    etc.
    """
    n = len(participants)
    pairings = []
    
    # Generate bracket indices for seeded pairings
    indices = list(range(n))
    
    # Pair first with last, second with second-to-last, etc.
    for i in range(n // 2):
        player_a = participants[indices[i]]
        player_b = participants[indices[n - 1 - i]]
        pairings.append((player_a, player_b))
    
    return pairings

def get_round_names(num_rounds: int, third_place_match: bool = False) -> List[str]:
    """Get standard round names for tournament"""
    if num_rounds == 1:
        return ["Final"]
    elif num_rounds == 2:
        names = ["Semifinals", "Final"]
    elif num_rounds == 3:
        names = ["Quarterfinals", "Semifinals", "Final"]
    elif num_rounds == 4:
        names = ["Round of 16", "Quarterfinals", "Semifinals", "Final"]
    elif num_rounds == 5:
        names = ["Round of 32", "Round of 16", "Quarterfinals", "Semifinals", "Final"]
    else:
        names = []
        for i in range(num_rounds - 3):
            names.append(f"Round {i + 1}")
        names.extend(["Quarterfinals", "Semifinals", "Final"])
    
    return names

def advance_winner_in_bracket(brackets: List[TournamentBracket], completed_match: TournamentMatch, winner: PlayerSimple) -> Optional[TournamentMatch]:
    """Advance winner to next round and return the next match they'll play
    
    Args:
        brackets: Current tournament brackets
        completed_match: The match that was just completed
        winner: The winning player
        
    Returns:
        The next match the winner will play in, or None if this was the final
    """
    current_round = completed_match.round
    current_position = completed_match.position
    
    # Find next round
    next_round_bracket = None
    for bracket in brackets:
        if bracket.round == current_round + 1:
            next_round_bracket = bracket
            break
    
    if not next_round_bracket:
        return None  # This was the final match
    
    # Calculate which match in next round this winner goes to
    next_position = (current_position + 1) // 2
    
    # Find the match and place the winner
    for match in next_round_bracket.matches:
        if match.position == next_position:
            # Determine if winner goes to player_a or player_b slot
            if current_position % 2 == 1:  # Odd position goes to player_a
                match.player_a = winner
            else:  # Even position goes to player_b
                match.player_b = winner
            
            return match
    
    return None
