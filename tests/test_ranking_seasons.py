"""
Test Suite for Ranking Seasons System
Tests: Season CRUD, Leaderboard, Player Stats, Multi-language support, Rewards
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials and data
TEST_PLAYER_ID = "jugador_544167d88272"
ACTIVE_SEASON_ID = "season_monthly_1"


class TestSeasonsCurrent:
    """Tests for GET /api/pinpanclub/seasons/current endpoint"""
    
    def test_get_current_season_default_lang(self):
        """GET /api/pinpanclub/seasons/current returns active season with Spanish as default"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        assert "season" in data
        season = data["season"]
        
        # Verify season structure
        assert season is not None
        assert "season_id" in season
        assert "name" in season
        assert "status" in season
        assert season["status"] == "active"
        
        # Verify multi-language name structure
        assert "es" in season["name"]
        assert "en" in season["name"]
        assert "zh" in season["name"]
        
        # Verify localized name defaults to Spanish
        assert "localized_name" in season
        assert "Temporada" in season["localized_name"]
    
    def test_get_current_season_spanish(self):
        """GET /api/pinpanclub/seasons/current?lang=es returns Spanish localization"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current?lang=es")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "localized_name" in season
        assert "Temporada" in season["localized_name"]
        assert "localized_description" in season
        assert "Compite" in season["localized_description"]
    
    def test_get_current_season_english(self):
        """GET /api/pinpanclub/seasons/current?lang=en returns English localization"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current?lang=en")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "localized_name" in season
        assert "Season" in season["localized_name"]
        assert "localized_description" in season
        assert "Compete" in season["localized_description"]
    
    def test_get_current_season_chinese(self):
        """GET /api/pinpanclub/seasons/current?lang=zh returns Chinese localization"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current?lang=zh")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "localized_name" in season
        assert "赛季" in season["localized_name"]
    
    def test_current_season_has_reward_tiers(self):
        """Current season includes 5 reward tiers (champion, top3, top10, top25, participant)"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "reward_tiers" in season
        tiers = season["reward_tiers"]
        assert len(tiers) == 5
        
        tier_names = [t["tier_name"] for t in tiers]
        assert "champion" in tier_names
        assert "top3" in tier_names
        assert "top10" in tier_names
        assert "top25" in tier_names
        assert "participant" in tier_names
    
    def test_current_season_reward_values(self):
        """Verify reward bonus points: Champion +1000, Top3 +500, Top10 +250, Top25 +100, Participant +25"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        tiers = data["season"]["reward_tiers"]
        
        tier_points = {t["tier_name"]: t["bonus_points"] for t in tiers}
        
        assert tier_points["champion"] == 1000
        assert tier_points["top3"] == 500
        assert tier_points["top10"] == 250
        assert tier_points["top25"] == 100
        assert tier_points["participant"] == 25
    
    def test_current_season_has_theme(self):
        """Current season includes visual theme with colors and icon"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "theme" in season
        theme = season["theme"]
        assert "id" in theme
        assert "name" in theme
        assert "colors" in theme
        assert "icon" in theme
        assert "primary" in theme["colors"]
        assert "secondary" in theme["colors"]


class TestSeasonsLeaderboard:
    """Tests for GET /api/pinpanclub/seasons/current/leaderboard endpoint"""
    
    def test_get_current_leaderboard(self):
        """GET /api/pinpanclub/seasons/current/leaderboard returns leaderboard"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert "season_id" in data
        assert "leaderboard" in data
        assert "total" in data
        
        # Verify leaderboard has participants
        assert len(data["leaderboard"]) > 0
    
    def test_leaderboard_has_positions(self):
        """Leaderboard entries include position numbers"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        for i, entry in enumerate(leaderboard, 1):
            assert "position" in entry
            assert entry["position"] == i
    
    def test_leaderboard_sorted_by_points(self):
        """Leaderboard is sorted by season_points descending"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        if len(leaderboard) > 1:
            for i in range(len(leaderboard) - 1):
                assert leaderboard[i]["season_points"] >= leaderboard[i + 1]["season_points"]
    
    def test_leaderboard_entry_structure(self):
        """Leaderboard entries have required fields"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        leaderboard = data["leaderboard"]
        
        if len(leaderboard) > 0:
            entry = leaderboard[0]
            assert "jugador_id" in entry
            assert "season_points" in entry
            assert "challenges_completed" in entry
            assert "jugador_info" in entry
            assert "position" in entry
    
    def test_leaderboard_limit_parameter(self):
        """Leaderboard respects limit parameter"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current/leaderboard?limit=2")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data["leaderboard"]) <= 2
    
    def test_leaderboard_by_season_id(self):
        """GET /api/pinpanclub/seasons/{season_id}/leaderboard returns leaderboard for specific season"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/{ACTIVE_SEASON_ID}/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        assert data["season_id"] == ACTIVE_SEASON_ID
        assert "leaderboard" in data


class TestPlayerSeasonStats:
    """Tests for player season statistics endpoints"""
    
    def test_get_player_current_season_stats(self):
        """GET /api/pinpanclub/seasons/player/{jugador_id}/current returns player stats"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/player/{TEST_PLAYER_ID}/current")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert data["jugador_id"] == TEST_PLAYER_ID
        assert "participating" in data
    
    def test_player_stats_when_participating(self):
        """Player stats include season data when participating"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/player/{TEST_PLAYER_ID}/current")
        assert response.status_code == 200
        
        data = response.json()
        
        if data["participating"]:
            assert "season_points" in data
            assert "challenges_completed" in data
            assert "current_position" in data
            assert "season_id" in data
    
    def test_player_stats_nonexistent_player(self):
        """Non-participating player returns participating=False"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/player/nonexistent_player/current")
        assert response.status_code == 200
        
        data = response.json()
        assert data["participating"] == False
        assert data["season_points"] == 0
        assert data["challenges_completed"] == 0
    
    def test_player_season_rewards(self):
        """GET /api/pinpanclub/seasons/player/{jugador_id}/rewards returns rewards list"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/player/{TEST_PLAYER_ID}/rewards")
        assert response.status_code == 200
        
        data = response.json()
        assert "jugador_id" in data
        assert "rewards" in data
        assert "total" in data
        assert isinstance(data["rewards"], list)


class TestSeasonsAll:
    """Tests for GET /api/pinpanclub/seasons/all endpoint"""
    
    def test_get_all_seasons(self):
        """GET /api/pinpanclub/seasons/all returns list of seasons"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/all")
        assert response.status_code == 200
        
        data = response.json()
        assert "seasons" in data
        assert "total" in data
        assert isinstance(data["seasons"], list)
        assert len(data["seasons"]) > 0
    
    def test_all_seasons_localized(self):
        """All seasons endpoint localizes names"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/all?lang=en")
        assert response.status_code == 200
        
        data = response.json()
        for season in data["seasons"]:
            assert "localized_name" in season


class TestSeasonById:
    """Tests for GET /api/pinpanclub/seasons/{season_id} endpoint"""
    
    def test_get_season_by_id(self):
        """GET /api/pinpanclub/seasons/{season_id} returns specific season"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/{ACTIVE_SEASON_ID}")
        assert response.status_code == 200
        
        data = response.json()
        assert "season" in data
        assert data["season"]["season_id"] == ACTIVE_SEASON_ID
    
    def test_get_season_by_id_not_found(self):
        """GET /api/pinpanclub/seasons/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/nonexistent_season")
        assert response.status_code == 404


class TestSeasonRewardTiers:
    """Tests for reward tier structure and badges"""
    
    def test_champion_tier_has_legendary_badge(self):
        """Champion tier has legendary badge with multi-language names"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        tiers = data["season"]["reward_tiers"]
        champion = next(t for t in tiers if t["tier_name"] == "champion")
        
        assert champion["badge"] is not None
        assert champion["badge"]["rarity"] == "legendary"
        assert "es" in champion["badge"]["name"]
        assert "en" in champion["badge"]["name"]
        assert "zh" in champion["badge"]["name"]
        assert champion["badge"]["icon"] == "🏆"
    
    def test_top3_tier_has_epic_badge(self):
        """Top 3 tier has epic badge"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        tiers = data["season"]["reward_tiers"]
        top3 = next(t for t in tiers if t["tier_name"] == "top3")
        
        assert top3["badge"] is not None
        assert top3["badge"]["rarity"] == "epic"
        assert top3["badge"]["icon"] == "🥇"
    
    def test_top10_tier_has_rare_badge(self):
        """Top 10 tier has rare badge"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        tiers = data["season"]["reward_tiers"]
        top10 = next(t for t in tiers if t["tier_name"] == "top10")
        
        assert top10["badge"] is not None
        assert top10["badge"]["rarity"] == "rare"
        assert top10["badge"]["icon"] == "⭐"
    
    def test_champion_has_perks(self):
        """Champion tier includes exclusive perks"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        tiers = data["season"]["reward_tiers"]
        champion = next(t for t in tiers if t["tier_name"] == "champion")
        
        assert "perks" in champion
        assert len(champion["perks"]) > 0
        assert "season_champion_frame" in champion["perks"]


class TestSeasonStatistics:
    """Tests for season statistics"""
    
    def test_season_has_participant_count(self):
        """Season includes total_participants count"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "total_participants" in season
        assert isinstance(season["total_participants"], int)
        assert season["total_participants"] >= 0
    
    def test_season_has_challenges_count(self):
        """Season includes total_challenges_completed count"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "total_challenges_completed" in season
        assert isinstance(season["total_challenges_completed"], int)
    
    def test_season_has_points_count(self):
        """Season includes total_points_earned count"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "total_points_earned" in season
        assert isinstance(season["total_points_earned"], int)


class TestSeasonDates:
    """Tests for season date handling"""
    
    def test_season_has_dates(self):
        """Season includes start_date and end_date"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "start_date" in season
        assert "end_date" in season
        assert season["start_date"] is not None
        assert season["end_date"] is not None
    
    def test_season_qualification_requirements(self):
        """Season includes qualification requirements"""
        response = requests.get(f"{BASE_URL}/api/pinpanclub/seasons/current")
        assert response.status_code == 200
        
        data = response.json()
        season = data["season"]
        
        assert "min_challenges_to_qualify" in season
        assert "min_points_to_qualify" in season
        assert season["min_challenges_to_qualify"] == 5
        assert season["min_points_to_qualify"] == 50


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
