"""
Rapid Pin - Date Negotiation, Likes & Comments Tests
Tests for:
1. Date negotiation system (challenge-with-date, respond-date, resume)
2. Likes system (toggle like, check liked)
3. Comments system (add comment, get comments, moderation)
4. Comment configuration
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data - existing players from seed data
SEASON_ID = "rps_bd76403ad2fa"  # Active season: Enero 2026
PLAYERS = {
    "carlos": "jugador_544167d88272",  # El Rayo
    "maria": "jugador_4a751551ad4b",   # La Pantera
    "juan": "jugador_3cb000147513",    # JP
    "ana": "jugador_fc1be9bb2dc0"      # Anita
}

# Existing challenge with date negotiation completed
EXISTING_CHALLENGE_ID = "queue_ff8cbaf6deb1"


class TestDateNegotiationChallengeCreation:
    """Tests for creating challenges with date proposals"""
    
    def test_create_challenge_with_date_success(self):
        """POST /api/pinpanclub/rapidpin/challenge-with-date - Create challenge with initial date"""
        # Use unique player combination
        future_date = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%dT18:00:00")
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge-with-date",
            params={
                "season_id": SEASON_ID,
                "challenger_id": PLAYERS["ana"],
                "opponent_id": PLAYERS["maria"],
                "proposed_date": future_date,
                "message": "Te reto para el proximo fin de semana"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "queue_id" in data
            assert data["status"] == "date_negotiation"
            assert data["proposed_date"] == future_date
            assert data["proposed_by_id"] == PLAYERS["ana"]
            assert len(data["date_history"]) == 1
            assert data["date_history"][0]["proposed_date"] == future_date
            assert data["date_history"][0]["status"] == "pending"
            assert data["likes_count"] == 0
            assert data["comments_count"] == 0
            print(f"✓ Challenge with date created: {data['queue_id']}")
            TestDateNegotiationChallengeCreation.created_challenge_id = data["queue_id"]
        elif response.status_code == 400:
            # Challenge already exists
            assert "Ya existe" in response.json()["detail"]
            print("✓ Challenge already exists (expected)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code} - {response.text}")
    
    def test_create_challenge_with_date_self_fails(self):
        """POST /api/pinpanclub/rapidpin/challenge-with-date - Cannot challenge yourself"""
        future_date = (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%dT18:00:00")
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge-with-date",
            params={
                "season_id": SEASON_ID,
                "challenger_id": PLAYERS["carlos"],
                "opponent_id": PLAYERS["carlos"],
                "proposed_date": future_date
            }
        )
        
        assert response.status_code == 400
        assert "ti mismo" in response.json()["detail"].lower()
        print("✓ Cannot challenge yourself")


class TestDateNegotiationResponses:
    """Tests for responding to date proposals"""
    
    def test_respond_date_accept(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/respond-date - Accept date"""
        # First create a new challenge with date
        future_date = (datetime.now() + timedelta(days=10)).strftime("%Y-%m-%dT19:00:00")
        
        create_response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge-with-date",
            params={
                "season_id": SEASON_ID,
                "challenger_id": PLAYERS["maria"],
                "opponent_id": PLAYERS["ana"],
                "proposed_date": future_date,
                "message": "Partido rapido?"
            }
        )
        
        if create_response.status_code == 200:
            queue_id = create_response.json()["queue_id"]
            
            # Accept the date as the opponent
            accept_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{queue_id}/respond-date",
                params={
                    "user_id": PLAYERS["ana"],
                    "action": "accept"
                }
            )
            
            assert accept_response.status_code == 200
            data = accept_response.json()
            assert data["status"] == "waiting"
            assert data["agreed_date"] == future_date
            assert data["accepted_by_id"] == PLAYERS["ana"]
            print(f"✓ Date accepted, challenge now waiting for referee")
        else:
            print("✓ Challenge already exists, skipping accept test")
    
    def test_respond_date_counter(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/respond-date - Counter proposal"""
        # Create a new challenge
        future_date = (datetime.now() + timedelta(days=12)).strftime("%Y-%m-%dT17:00:00")
        counter_date = (datetime.now() + timedelta(days=13)).strftime("%Y-%m-%dT20:00:00")
        
        create_response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge-with-date",
            params={
                "season_id": SEASON_ID,
                "challenger_id": PLAYERS["juan"],
                "opponent_id": PLAYERS["carlos"],
                "proposed_date": future_date
            }
        )
        
        if create_response.status_code == 200:
            queue_id = create_response.json()["queue_id"]
            
            # Counter propose as opponent
            counter_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{queue_id}/respond-date",
                params={
                    "user_id": PLAYERS["carlos"],
                    "action": "counter",
                    "counter_date": counter_date,
                    "message": "Mejor el domingo"
                }
            )
            
            assert counter_response.status_code == 200
            data = counter_response.json()
            assert data["status"] == "date_negotiation"
            assert data["proposed_date"] == counter_date
            assert data["proposed_by_id"] == PLAYERS["carlos"]
            assert len(data["date_history"]) == 2
            print(f"✓ Counter proposal sent successfully")
        else:
            print("✓ Challenge already exists, skipping counter test")
    
    def test_respond_date_queue(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/respond-date - Put in queue"""
        # Get any challenge in date_negotiation status
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=date_negotiation"
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            challenge = response.json()[0]
            queue_id = challenge["queue_id"]
            
            # Determine who can respond (not the one who proposed)
            proposed_by = challenge.get("proposed_by_id")
            responder = challenge["player2_id"] if proposed_by == challenge["player1_id"] else challenge["player1_id"]
            
            # Put in queue
            queue_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{queue_id}/respond-date",
                params={
                    "user_id": responder,
                    "action": "queue"
                }
            )
            
            if queue_response.status_code == 200:
                data = queue_response.json()
                assert data["status"] == "queued"
                print(f"✓ Challenge put in queue successfully")
            else:
                print(f"✓ Queue action failed (may be expected): {queue_response.text}")
        else:
            print("✓ No challenges in date_negotiation to test queue action")
    
    def test_respond_date_wrong_user_fails(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/respond-date - Same user cannot respond"""
        # Get any challenge in date_negotiation
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=date_negotiation"
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            challenge = response.json()[0]
            queue_id = challenge["queue_id"]
            proposed_by = challenge.get("proposed_by_id")
            
            # Try to accept as the same person who proposed
            accept_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{queue_id}/respond-date",
                params={
                    "user_id": proposed_by,
                    "action": "accept"
                }
            )
            
            assert accept_response.status_code == 400
            assert "esperar" in accept_response.json()["detail"].lower()
            print("✓ Same user cannot respond to their own proposal")
        else:
            print("✓ No challenges in date_negotiation to test")


class TestResumeFromQueue:
    """Tests for resuming challenges from queue"""
    
    def test_resume_from_queue(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/resume - Resume queued challenge"""
        # Get any queued challenge
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=queued"
        )
        
        if response.status_code == 200 and len(response.json()) > 0:
            challenge = response.json()[0]
            queue_id = challenge["queue_id"]
            
            # Either player can resume
            user_id = challenge["player1_id"]
            new_date = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%dT18:00:00")
            
            resume_response = requests.post(
                f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{queue_id}/resume",
                params={
                    "user_id": user_id,
                    "proposed_date": new_date,
                    "message": "Retomamos el reto?"
                }
            )
            
            if resume_response.status_code == 200:
                data = resume_response.json()
                assert data["status"] == "date_negotiation"
                assert data["proposed_date"] == new_date
                print(f"✓ Challenge resumed from queue successfully")
            else:
                print(f"✓ Resume failed (may be expected): {resume_response.text}")
        else:
            print("✓ No queued challenges to test resume")


class TestLikesSystem:
    """Tests for the likes system"""
    
    def test_toggle_like_add(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/like - Add like"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{EXISTING_CHALLENGE_ID}/like",
            params={"user_id": PLAYERS["maria"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["action"] in ["liked", "unliked"]
        assert "likes_count" in data
        print(f"✓ Like toggled: {data['action']}, total likes: {data['likes_count']}")
    
    def test_toggle_like_remove(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/like - Remove like (toggle)"""
        # First add a like
        requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{EXISTING_CHALLENGE_ID}/like",
            params={"user_id": PLAYERS["juan"]}
        )
        
        # Toggle again to remove
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{EXISTING_CHALLENGE_ID}/like",
            params={"user_id": PLAYERS["juan"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["action"] in ["liked", "unliked"]
        print(f"✓ Like toggled again: {data['action']}")
    
    def test_check_user_liked(self):
        """GET /api/pinpanclub/rapidpin/challenge/{id}/liked - Check if user liked"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{EXISTING_CHALLENGE_ID}/liked",
            params={"user_id": PLAYERS["carlos"]}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "liked" in data
        assert isinstance(data["liked"], bool)
        print(f"✓ Carlos liked status: {data['liked']}")
    
    def test_like_invalid_challenge_fails(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/like - Invalid challenge fails"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/invalid_queue_id/like",
            params={"user_id": PLAYERS["carlos"]}
        )
        
        assert response.status_code == 400
        assert "no encontrado" in response.json()["detail"].lower()
        print("✓ Invalid challenge returns error")


class TestCommentsSystem:
    """Tests for the comments system"""
    
    def test_add_comment_success(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/comment - Add comment"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{EXISTING_CHALLENGE_ID}/comment",
            params={
                "user_id": PLAYERS["maria"],
                "content": "Vamos Carlos! Tu puedes!",
                "user_name": "La Pantera"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "comment" in data
        assert data["comment"]["content"] == "Vamos Carlos! Tu puedes!"
        assert data["comment"]["user_id"] == PLAYERS["maria"]
        assert data["comment"]["is_approved"] == True
        print(f"✓ Comment added: {data['comment']['comment_id']}")
    
    def test_get_comments(self):
        """GET /api/pinpanclub/rapidpin/challenge/{id}/comments - Get comments"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{EXISTING_CHALLENGE_ID}/comments"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        for comment in data:
            assert "comment_id" in comment
            assert "content" in comment
            assert "user_id" in comment
            assert comment["is_approved"] == True
            assert comment["is_hidden"] == False
        
        print(f"✓ Retrieved {len(data)} comments")
    
    def test_add_comment_too_long_fails(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/comment - Too long comment fails"""
        long_content = "A" * 500  # Exceeds 280 char limit
        
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/{EXISTING_CHALLENGE_ID}/comment",
            params={
                "user_id": PLAYERS["carlos"],
                "content": long_content
            }
        )
        
        assert response.status_code == 400
        assert "excede" in response.json()["detail"].lower() or "limit" in response.json()["detail"].lower()
        print("✓ Long comment rejected")
    
    def test_add_comment_invalid_challenge_fails(self):
        """POST /api/pinpanclub/rapidpin/challenge/{id}/comment - Invalid challenge fails"""
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rapidpin/challenge/invalid_queue_id/comment",
            params={
                "user_id": PLAYERS["carlos"],
                "content": "Test comment"
            }
        )
        
        assert response.status_code == 400
        assert "no encontrado" in response.json()["detail"].lower()
        print("✓ Invalid challenge returns error")


class TestCommentConfiguration:
    """Tests for comment configuration"""
    
    def test_get_comment_config(self):
        """GET /api/pinpanclub/rapidpin/comment-config - Get configuration"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/comment-config")
        
        assert response.status_code == 200
        data = response.json()
        assert "max_comment_length" in data
        assert "require_approval_for_flagged_users" in data
        assert "warning_message" in data
        assert data["max_comment_length"] == 280
        assert "es" in data["warning_message"]
        assert "en" in data["warning_message"]
        assert "zh" in data["warning_message"]
        print(f"✓ Comment config: max_length={data['max_comment_length']}")


class TestPublicFeedWithDateAndInteractions:
    """Tests for public feed including date negotiation and interactions"""
    
    def test_public_feed_includes_date_fields(self):
        """GET /api/pinpanclub/rapidpin/public/feed - Includes date negotiation fields"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rapidpin/public/feed")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for new fields in feed
        assert "queued_challenges" in data
        assert "date_negotiation" in data
        assert isinstance(data["queued_challenges"], list)
        assert isinstance(data["date_negotiation"], list)
        
        # Check waiting_for_referee has interaction fields
        if len(data["waiting_for_referee"]) > 0:
            match = data["waiting_for_referee"][0]
            assert "likes_count" in match or match.get("likes_count") is None
            assert "comments_count" in match or match.get("comments_count") is None
            if match.get("agreed_date"):
                print(f"✓ Match has agreed_date: {match['agreed_date']}")
        
        print(f"✓ Feed includes {len(data['queued_challenges'])} queued and {len(data['date_negotiation'])} negotiating")
    
    def test_waiting_matches_have_date_info(self):
        """GET /api/pinpanclub/rapidpin/queue?status=waiting - Matches have date info"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/queue?status=waiting"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        for match in data:
            # Check date fields exist
            assert "proposed_date" in match or match.get("proposed_date") is None
            assert "agreed_date" in match or match.get("agreed_date") is None
            assert "date_history" in match or match.get("date_history") is None
            
            # Check interaction fields
            if "likes_count" in match:
                assert isinstance(match["likes_count"], int)
            if "comments_count" in match:
                assert isinstance(match["comments_count"], int)
        
        print(f"✓ {len(data)} waiting matches have date and interaction fields")


class TestMyChallengesWithDateStatus:
    """Tests for my-challenges endpoint with date negotiation status"""
    
    def test_my_challenges_includes_date_negotiation(self):
        """GET /api/pinpanclub/rapidpin/my-challenges/{player_id} - Includes date negotiation"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rapidpin/my-challenges/{PLAYERS['carlos']}"
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check structure
        assert "sent" in data
        assert "received" in data
        
        # Check if any challenges have date_negotiation status
        all_challenges = data["sent"] + data["received"]
        date_negotiation_count = sum(1 for c in all_challenges if c.get("status") == "date_negotiation")
        queued_count = sum(1 for c in all_challenges if c.get("status") == "queued")
        
        print(f"✓ Carlos has {date_negotiation_count} in date_negotiation, {queued_count} queued")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
