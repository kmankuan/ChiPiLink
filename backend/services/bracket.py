from typing import List, Dict, Any, Optional
from models.tournament import TournamentBracket, TournamentMatch
from models.player import PlayerSimple
import uuid
import math


def generate_single_elimination_brackets(participants: List[PlayerSimple], third_place_match: bool = True) -> List[TournamentBracket]:
    """Generate single elimination tournament brackets"""
    num_participants = len(participants)
    if num_participants < 2:
        return []
    
    num_rounds = math.ceil(math.log2(num_participants))
    next_power_of_2 = 2 ** num_rounds
    padded_participants = participants + [None] * (next_power_of_2 - num_participants)
    
    brackets = []
    round_names = get_round_names(num_rounds, third_place_match)
    
    # Generate first round
    pairings = generate_seeded_pairings(padded_participants)
    first_round_matches = []
    for i, (player_a, player_b) in enumerate(pairings):
        match = TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:8]}",
            round=1,
            position=i + 1,
            player_a=player_a,
            player_b=player_b,
            status="pending" if player_a and player_b else "bye"
        )
        first_round_matches.append(match)
    
    brackets.append(TournamentBracket(round=1, name=round_names[0], matches=first_round_matches))
    
    # Generate subsequent rounds
    for round_num in range(2, num_rounds + 1):
        num_matches = 2 ** (num_rounds - round_num)
        matches = []
        for i in range(num_matches):
            feeds = [i * 2 + 1, i * 2 + 2]
            match = TournamentMatch(
                match_id=f"tm_{uuid.uuid4().hex[:8]}",
                round=round_num,
                position=i + 1,
                status="waiting",
                feeds_from=feeds
            )
            matches.append(match)
        brackets.append(TournamentBracket(round=round_num, name=round_names[round_num - 1], matches=matches))
    
    # Third place match
    if third_place_match and num_rounds > 1:
        brackets.append(TournamentBracket(
            round=num_rounds + 1,
            name="Third Place",
            matches=[TournamentMatch(
                match_id=f"tm_{uuid.uuid4().hex[:8]}",
                round=num_rounds + 1,
                position=1,
                status="waiting",
                is_third_place=True
            )]
        ))
    
    return brackets


def generate_double_elimination_brackets(participants: List[PlayerSimple]) -> List[TournamentBracket]:
    """Generate double elimination tournament brackets.
    
    Structure:
    - Winners Bracket (W): standard single-elimination
    - Losers Bracket (L): losers drop down; must lose twice to be eliminated
    - Grand Final: winners bracket champ vs losers bracket champ
    """
    num_participants = len(participants)
    if num_participants < 4:
        return []

    num_rounds_w = math.ceil(math.log2(num_participants))
    next_power = 2 ** num_rounds_w
    padded = participants + [None] * (next_power - num_participants)

    brackets = []
    bracket_index = 0

    # ── Winners Bracket ──
    pairings = generate_seeded_pairings(padded)
    w_r1_matches = []
    for i, (pa, pb) in enumerate(pairings):
        w_r1_matches.append(TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:8]}",
            round=1, position=i + 1,
            player_a=pa, player_b=pb,
            status="pending" if pa and pb else "bye",
        ))
    brackets.append(TournamentBracket(
        round=1, name=f"Winners R1",
        matches=w_r1_matches,
    ))

    for wr in range(2, num_rounds_w + 1):
        n_matches = 2 ** (num_rounds_w - wr)
        matches = [TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:8]}",
            round=wr, position=j + 1,
            status="waiting",
        ) for j in range(n_matches)]

        rname = "Winners Final" if wr == num_rounds_w else f"Winners R{wr}"
        brackets.append(TournamentBracket(round=wr, name=rname, matches=matches))

    # ── Losers Bracket ──
    # Losers bracket has roughly 2*(num_rounds_w - 1) rounds
    # Round L1: losers from W R1 play each other  (n/4 matches if 8 players)
    # Round L2: winners of L1 play losers from W R2
    # Round L3: winners of L2 play each other
    # ... and so on until 1 player remains
    losers_round_base = num_rounds_w + 1  # offset round numbers
    num_losers_rounds = 2 * (num_rounds_w - 1)

    for lr in range(1, num_losers_rounds + 1):
        # Calculate matches for this losers round
        if lr == 1:
            n_matches = next_power // 4
        elif lr % 2 == 0:
            # Even losers rounds: same count as previous (drop-down round)
            n_matches = max(1, brackets[-1].matches.__len__())
        else:
            # Odd losers rounds: halve the count
            n_matches = max(1, brackets[-1].matches.__len__() // 2)

        rnum = losers_round_base + lr - 1
        rname = "Losers Final" if lr == num_losers_rounds else f"Losers R{lr}"
        matches = [TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:8]}",
            round=rnum, position=j + 1,
            status="waiting",
        ) for j in range(n_matches)]
        brackets.append(TournamentBracket(round=rnum, name=rname, matches=matches))

    # ── Grand Final ──
    gf_round = losers_round_base + num_losers_rounds
    brackets.append(TournamentBracket(
        round=gf_round,
        name="Grand Final",
        matches=[TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:8]}",
            round=gf_round, position=1,
            status="waiting",
        )],
    ))

    # Optional reset match (if losers bracket champ wins grand final)
    brackets.append(TournamentBracket(
        round=gf_round + 1,
        name="Grand Final Reset",
        matches=[TournamentMatch(
            match_id=f"tm_{uuid.uuid4().hex[:8]}",
            round=gf_round + 1, position=1,
            status="waiting",
        )],
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
