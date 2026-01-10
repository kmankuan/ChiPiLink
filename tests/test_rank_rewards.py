"""
Test Rank Rewards System - Sistema de recompensas por subida de rango
Tests for: GET /api/pinpanclub/rank-rewards/info, /current/{jugador_id}, /player/{jugador_id}/history
POST /api/pinpanclub/rank-rewards/check-promotion/{jugador_id}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test player ID from context
TEST_PLAYER_ID = "jugador_544167d88272"


class TestRankRewardsInfo:
    """Tests for GET /api/pinpanclub/rank-rewards/info endpoint"""
    
    def test_rank_rewards_info_spanish(self):
        """Test rank rewards info returns 7 ranks in Spanish"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rank-rewards/info?lang=es")
        assert response.status_code == 200
        
        data = response.json()
        assert "ranks" in data
        assert data["total_ranks"] == 7
        assert data["lang"] == "es"
        
        # Verify all 7 ranks are present
        ranks = data["ranks"]
        assert len(ranks) == 7
        
        # Verify rank IDs in order
        expected_ids = ["bronze", "silver", "gold", "platinum", "diamond", "master", "grandmaster"]
        actual_ids = [r["id"] for r in ranks]
        assert actual_ids == expected_ids
        
        # Verify Spanish names
        expected_names = ["Bronce", "Plata", "Oro", "Platino", "Diamante", "Maestro", "Gran Maestro"]
        actual_names = [r["name"] for r in ranks]
        assert actual_names == expected_names
        
        # Verify Bronze has no reward (initial rank)
        bronze = ranks[0]
        assert bronze["reward"] is None
        
        # Verify Silver has points_bonus reward
        silver = ranks[1]
        assert silver["reward"] is not None
        assert silver["reward"]["type"] == "points_bonus"
        assert silver["reward"]["value"] == 50
        
        # Verify Gold has points_bonus reward
        gold = ranks[2]
        assert gold["reward"]["type"] == "points_bonus"
        assert gold["reward"]["value"] == 100
        
        # Verify Platinum has badge
        platinum = ranks[3]
        assert platinum["reward"]["badge"] is not None
        assert platinum["reward"]["badge"]["rarity"] == "rare"
        
        # Verify Master has perks
        master = ranks[5]
        assert "vip_access" in master["reward"]["perks"]
        
        # Verify Grand Master has all perks
        grandmaster = ranks[6]
        assert "hall_of_fame" in grandmaster["reward"]["perks"]
        assert grandmaster["reward"]["badge"]["rarity"] == "legendary"
    
    def test_rank_rewards_info_english(self):
        """Test rank rewards info returns 7 ranks in English"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rank-rewards/info?lang=en")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_ranks"] == 7
        assert data["lang"] == "en"
        
        # Verify English names
        ranks = data["ranks"]
        expected_names = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grand Master"]
        actual_names = [r["name"] for r in ranks]
        assert actual_names == expected_names
        
        # Verify English descriptions
        silver = ranks[1]
        assert "50 points bonus" in silver["reward"]["description"]
        
        # Verify English badge names
        platinum = ranks[3]
        assert platinum["reward"]["badge"]["name"] == "Club Elite"
    
    def test_rank_rewards_info_chinese(self):
        """Test rank rewards info returns ranks in Chinese"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rank-rewards/info?lang=zh")
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_ranks"] == 7
        
        # Verify Chinese names
        ranks = data["ranks"]
        expected_names = ["青铜", "白银", "黄金", "铂金", "钻石", "大师", "宗师"]
        actual_names = [r["name"] for r in ranks]
        assert actual_names == expected_names
    
    def test_rank_rewards_info_default_language(self):
        """Test rank rewards info defaults to Spanish"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rank-rewards/info")
        assert response.status_code == 200
        
        data = response.json()
        assert data["lang"] == "es"
        assert data["ranks"][0]["name"] == "Bronce"


class TestPlayerCurrentRank:
    """Tests for GET /api/pinpanclub/rank-rewards/current/{jugador_id} endpoint"""
    
    def test_get_current_rank(self):
        """Test getting current rank for test player"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/current/{TEST_PLAYER_ID}?lang=es"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["jugador_id"] == TEST_PLAYER_ID
        assert "total_points" in data
        assert "current_rank" in data
        assert "next_rank" in data
        assert "points_to_next" in data
        assert "earned_ranks" in data
        
        # Verify current rank structure
        current_rank = data["current_rank"]
        assert "id" in current_rank
        assert "name" in current_rank
        assert "icon" in current_rank
        assert "reward_earned" in current_rank
        
        # Test player has 450 points = Gold rank
        assert data["total_points"] == 450
        assert current_rank["id"] == "gold"
        assert current_rank["name"] == "Oro"
        assert current_rank["icon"] == "🥇"
        
        # Verify next rank is Platinum
        next_rank = data["next_rank"]
        assert next_rank["id"] == "platinum"
        assert next_rank["min_points"] == 600
        
        # Verify points to next
        assert data["points_to_next"] == 150  # 600 - 450
    
    def test_get_current_rank_english(self):
        """Test getting current rank in English"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/current/{TEST_PLAYER_ID}?lang=en"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["current_rank"]["name"] == "Gold"
        assert data["next_rank"]["name"] == "Platinum"
    
    def test_get_current_rank_nonexistent_player(self):
        """Test getting current rank for non-existent player returns 0 points"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/current/nonexistent_player_123?lang=es"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_points"] == 0
        assert data["current_rank"]["id"] == "bronze"


class TestPlayerRankHistory:
    """Tests for GET /api/pinpanclub/rank-rewards/player/{jugador_id}/history endpoint"""
    
    def test_get_rank_history(self):
        """Test getting rank history for test player"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/player/{TEST_PLAYER_ID}/history"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["jugador_id"] == TEST_PLAYER_ID
        assert "history" in data
        assert "total_promotions" in data
        
        # Test player should have at least Gold promotion
        history = data["history"]
        assert len(history) >= 1
        
        # Verify history entry structure
        if len(history) > 0:
            entry = history[0]
            assert "rank_id" in entry
            assert "rank_name" in entry
            assert "rank_icon" in entry
            assert "reward_type" in entry
            assert "reward_value" in entry
            assert "granted_at" in entry
    
    def test_get_rank_history_nonexistent_player(self):
        """Test getting rank history for non-existent player returns empty"""
        response = requests.get(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/player/nonexistent_player_123/history"
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["history"] == []
        assert data["total_promotions"] == 0


class TestCheckPromotion:
    """Tests for POST /api/pinpanclub/rank-rewards/check-promotion/{jugador_id} endpoint"""
    
    def test_check_promotion_no_rank_change(self):
        """Test check promotion when no rank change occurs"""
        # 450 to 500 points - still Gold (300-599)
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/check-promotion/{TEST_PLAYER_ID}",
            params={"old_points": 450, "new_points": 500, "lang": "es"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["promoted"] == False
        assert data["message"] == "No rank promotion"
    
    def test_check_promotion_already_earned(self):
        """Test check promotion for already earned rank"""
        # Silver to Gold - but Gold already earned
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/check-promotion/{TEST_PLAYER_ID}",
            params={"old_points": 250, "new_points": 350, "lang": "es"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # Should return no promotion since Gold was already earned
        assert data["promoted"] == False
    
    def test_check_promotion_new_player(self):
        """Test check promotion for new player reaching Silver"""
        # Create a unique test player ID
        test_player = "TEST_rank_promo_player_001"
        
        # Bronze to Silver promotion (0 to 100 points)
        response = requests.post(
            f"{BASE_URL}/api/pinpanclub/rank-rewards/check-promotion/{test_player}",
            params={"old_points": 50, "new_points": 150, "lang": "es"}
        )
        assert response.status_code == 200
        
        data = response.json()
        # First time reaching Silver should grant promotion
        if data["promoted"]:
            assert "promotion" in data
            promotion = data["promotion"]
            assert promotion["new_rank"]["id"] == "silver"
            assert promotion["reward"]["bonus_points"] == 50


class TestRankRewardsStructure:
    """Tests for rank rewards data structure and point thresholds"""
    
    def test_rank_point_thresholds(self):
        """Test that rank point thresholds are correct"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rank-rewards/info?lang=es")
        assert response.status_code == 200
        
        ranks = response.json()["ranks"]
        
        # Verify point thresholds
        expected_thresholds = [
            ("bronze", 0, 99),
            ("silver", 100, 299),
            ("gold", 300, 599),
            ("platinum", 600, 999),
            ("diamond", 1000, 1999),
            ("master", 2000, 4999),
            ("grandmaster", 5000, None)  # No max for grandmaster
        ]
        
        for i, (rank_id, min_pts, max_pts) in enumerate(expected_thresholds):
            rank = ranks[i]
            assert rank["id"] == rank_id
            assert rank["min_points"] == min_pts
            assert rank["max_points"] == max_pts
    
    def test_rank_reward_values(self):
        """Test that rank reward values are correct"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rank-rewards/info?lang=es")
        assert response.status_code == 200
        
        ranks = response.json()["ranks"]
        
        # Verify reward values
        expected_rewards = [
            ("bronze", None),
            ("silver", 50),
            ("gold", 100),
            ("platinum", 200),
            ("diamond", 500),
            ("master", 1000),
            ("grandmaster", 2500)
        ]
        
        for i, (rank_id, expected_value) in enumerate(expected_rewards):
            rank = ranks[i]
            if expected_value is None:
                assert rank["reward"] is None
            else:
                assert rank["reward"]["value"] == expected_value
    
    def test_rank_icons(self):
        """Test that rank icons are correct"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/rank-rewards/info?lang=es")
        assert response.status_code == 200
        
        ranks = response.json()["ranks"]
        
        expected_icons = ["🥉", "🥈", "🥇", "💎", "💠", "👑", "🏆"]
        actual_icons = [r["icon"] for r in ranks]
        assert actual_icons == expected_icons


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
