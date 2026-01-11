"""
Rapid Pin Challenge System Tests
Tests for the player-to-player challenge system
Endpoints: create challenge, accept, decline, assign referee
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data - existing players from seed data
SEASON_ID = "rps_bd76403ad2fa"  # Active season: Enero 2026
PLAYERS = {
    "carlos": "jugador_544167d88272",  # El Rayo
    "maria": "jugador_4a751551ad4b",   # La Pantera
    "juan": "jugador_3cb000147513",    # JP
    "ana": "jugador_fc1be9bb2dc0"      # Anita
}


class TestChallengeCreation:
    """Tests for creating challenges between players"""
    
    def test_create_challenge_success(self):
        """POST /api/pinpanclub/rapidpin/challenge - Create challenge between two players"""
        # Use unique player combination to avoid "already exists" error
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge",
            params={
                "season_id": SEASON_ID,
                "challenger_id": PLAYERS["maria"],
                "opponent_id": PLAYERS["juan"]
            }
        )
        
        # May return 200 (success) or 400 (already exists)
        if response.status_code == 200:
            data = response.json()
            assert "queue_id" in data
            assert data["status"] == "challenge_pending"
            assert data["player1_id"] == PLAYERS["maria"]
            assert data["player2_id"] == PLAYERS["juan"]
            assert data["player1_info"] is not None
            assert data["player2_info"] is not None
            print(f"✓ Challenge created: {data['queue_id']}")
            TestChallengeCreation.created_challenge_id = data["queue_id"]
        elif response.status_code == 400:
            # Challenge already exists - this is OK for testing
            assert "Ya existe" in response.json()["detail"]
            print("✓ Challenge already exists (expected)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")
    
    def test_create_challenge_self_fails(self):
        """POST /api/pinpanclub/rapidpin/challenge - Cannot challenge yourself"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge",
            params={
                "season_id": SEASON_ID,
                "challenger_id": PLAYERS["carlos"],
                "opponent_id": PLAYERS["carlos"]
            }
        )
        assert response.status_code == 400
        assert "ti mismo" in response.json()["detail"].lower() or "yourself" in response.json()["detail"].lower()
    
    def test_create_challenge_invalid_season(self):
        """POST /api/pinpanclub/rapidpin/challenge - Invalid season returns error"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge",
            params={
                "season_id": "invalid_season_id",
                "challenger_id": PLAYERS["carlos"],
                "opponent_id": PLAYERS["maria"]
            }
        )
        assert response.status_code == 400
        assert "no encontrada" in response.json()["detail"].lower() or "not found" in response.json()["detail"].lower()


class TestChallengeAcceptDecline:
    """Tests for accepting and declining challenges"""
    
    def test_get_my_challenges(self):
        """GET /api/pinpanclub/rapidpin/my-challenges/{player_id} - Get player's challenges"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/my-challenges/{PLAYERS['carlos']}"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert "sent" in data
        assert "received" in data
        assert "total" in data
        assert isinstance(data["sent"], list)
        assert isinstance(data["received"], list)
        print(f"✓ Carlos has {len(data['sent'])} sent and {len(data['received'])} received challenges")
    
    def test_accept_challenge(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/accept - Accept a challenge"""
        # First get pending challenges for Juan
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/my-challenges/{PLAYERS['juan']}"
        )
        assert response.status_code == 200
        
        challenges = response.json()
        if len(challenges["received"]) > 0:
            challenge = challenges["received"][0]
            queue_id = challenge["queue_id"]
            
            # Accept the challenge
            accept_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{queue_id}/accept",
                params={
                    "user_id": PLAYERS["juan"],
                    "user_role": "player"
                }
            )
            
            if accept_response.status_code == 200:
                data = accept_response.json()
                assert data["status"] == "waiting"
                assert data["accepted_by_id"] == PLAYERS["juan"]
                print(f"✓ Challenge {queue_id} accepted, now waiting for referee")
            elif accept_response.status_code == 400:
                # Already processed
                print("✓ Challenge already processed")
        else:
            print("✓ No pending challenges to accept (skipped)")
    
    def test_decline_challenge_wrong_user_fails(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/decline - Only opponent can decline"""
        # Get any pending challenge
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=challenge_pending"
        )
        assert response.status_code == 200
        
        challenges = response.json()
        if len(challenges) > 0:
            challenge = challenges[0]
            queue_id = challenge["queue_id"]
            challenger_id = challenge["player1_id"]
            
            # Try to decline as the challenger (should fail)
            decline_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{queue_id}/decline",
                params={
                    "user_id": challenger_id,
                    "reason": "Test decline"
                }
            )
            
            assert decline_response.status_code == 400
            assert "oponente" in decline_response.json()["detail"].lower() or "opponent" in decline_response.json()["detail"].lower()
            print("✓ Challenger cannot decline their own challenge")
        else:
            print("✓ No pending challenges to test (skipped)")


class TestRefereeAssignment:
    """Tests for referee assignment to waiting matches"""
    
    def test_get_waiting_matches(self):
        """GET /api/pinpanclub/rapidpin/queue?status=waiting - Get matches waiting for referee"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=waiting"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        for match in data:
            assert match["status"] == "waiting"
            assert match["referee_id"] is None
        
        print(f"✓ Found {len(data)} matches waiting for referee")
    
    def test_assign_referee_player_cannot_be_referee(self):
        """POST /api/pinpanclub/rapidpin/queue/{id}/assign - Player cannot referee their own match"""
        # Get a waiting match
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=waiting"
        )
        assert response.status_code == 200
        
        matches = response.json()
        if len(matches) > 0:
            match = matches[0]
            queue_id = match["queue_id"]
            player1_id = match["player1_id"]
            
            # Try to assign player1 as referee (should fail)
            assign_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/queue/{queue_id}/assign",
                params={"referee_id": player1_id}
            )
            
            assert assign_response.status_code == 400
            assert "jugador" in assign_response.json()["detail"].lower() or "player" in assign_response.json()["detail"].lower()
            print("✓ Player cannot referee their own match")
        else:
            print("✓ No waiting matches to test (skipped)")
    
    def test_assign_referee_success(self):
        """POST /api/pinpanclub/rapidpin/queue/{id}/assign - Successfully assign referee"""
        # Get a waiting match
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=waiting"
        )
        assert response.status_code == 200
        
        matches = response.json()
        if len(matches) > 0:
            match = matches[0]
            queue_id = match["queue_id"]
            player1_id = match["player1_id"]
            player2_id = match["player2_id"]
            
            # Find a player who is not in this match
            referee_id = None
            for player_name, player_id in PLAYERS.items():
                if player_id not in [player1_id, player2_id]:
                    referee_id = player_id
                    break
            
            if referee_id:
                assign_response = requests.post(
                    f"{BASE_URL}/api/pinpanclub/rapidpin/queue/{queue_id}/assign",
                    params={"referee_id": referee_id}
                )
                
                if assign_response.status_code == 200:
                    data = assign_response.json()
                    assert data["status"] == "assigned"
                    assert data["referee_id"] == referee_id
                    assert data["referee_info"] is not None
                    print(f"✓ Referee {referee_id} assigned to match {queue_id}")
                elif assign_response.status_code == 400:
                    print("✓ Match already has referee or other error")
            else:
                print("✓ No available referee (skipped)")
        else:
            print("✓ No waiting matches to test (skipped)")


class TestPublicFeed:
    """Tests for the public feed endpoint"""
    
    def test_public_feed_structure(self):
        """GET /api/pinpanclub/rapidpin/public/feed - Verify feed structure"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/public/feed")
        assert response.status_code == 200
        
        data = response.json()
        assert data["success"] == True
        assert "timestamp" in data
        assert "stats" in data
        assert "active_season" in data
        assert "recent_matches" in data
        assert "top_players" in data
        assert "waiting_for_referee" in data
        assert "in_progress" in data
        assert "pending_challenges" in data
        assert "scoring_rules" in data
        
        # Verify scoring rules
        scoring = data["scoring_rules"]
        assert scoring["victory"] == 3
        assert scoring["defeat"] == 1
        assert scoring["referee"] == 2
        
        print(f"✓ Public feed has {len(data['waiting_for_referee'])} matches waiting for referee")
        print(f"✓ Public feed has {len(data['pending_challenges'])} pending challenges")
    
    def test_public_feed_active_season(self):
        """GET /api/pinpanclub/rapidpin/public/feed - Verify active season info"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/public/feed")
        assert response.status_code == 200
        
        data = response.json()
        active_season = data["active_season"]
        
        if active_season:
            assert "season_id" in active_season
            assert "nombre" in active_season
            assert active_season["estado"] == "active"
            print(f"✓ Active season: {active_season['nombre']}")
        else:
            print("✓ No active season (expected if none configured)")


class TestQueueFilters:
    """Tests for queue filtering"""
    
    def test_queue_filter_by_status(self):
        """GET /api/pinpanclub/rapidpin/queue - Filter by status"""
        statuses = ["challenge_pending", "waiting", "assigned", "active"]
        
        for status in statuses:
            response = requests.get(
                f"{BASE_URL}/api/pinpanclub/rapidpin/queue",
                params={"status": status}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list)
            
            if status == "active":
                # Active includes multiple statuses
                for item in data:
                    assert item["status"] in ["challenge_pending", "waiting", "assigned"]
            else:
                for item in data:
                    assert item["status"] == status
            
            print(f"✓ Queue filter '{status}': {len(data)} items")
    
    def test_queue_filter_by_player(self):
        """GET /api/pinpanclub/rapidpin/queue - Filter by player"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue",
            params={"player_id": PLAYERS["carlos"]}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        for item in data:
            assert PLAYERS["carlos"] in [item["player1_id"], item["player2_id"]]
        
        print(f"✓ Carlos is involved in {len(data)} queue items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
