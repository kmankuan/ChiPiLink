from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from typing import List, Optional, Dict, Any
from ..core.database import sport_live_sessions, sport_players
from ..core.auth import get_optional_user
from ..models.live_session import (
    LiveSession, LiveSessionCreate, ScorePoint, RefereeUpdate,
    Point, ScoreState, LiveSessionTimers, LiveSessionDisplay, LiveSessionSettings
)
from ..models.player import PlayerSimple
from ..services.emotions import detect_emotions, calculate_momentum, should_change_server
from datetime import datetime, timezone
import uuid
import json

router = APIRouter(prefix="/api/sport/live", tags=["live"])

# WebSocket connections manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            if websocket in self.active_connections[session_id]:
                self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def broadcast_to_session(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id][:]:
                try:
                    await connection.send_text(json.dumps(message))
                except Exception:
                    self.active_connections[session_id].remove(connection)

manager = ConnectionManager()

@router.websocket("/ws/live/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await manager.connect(websocket, session_id)
    try:
        while True:
            # Keep connection alive and handle any incoming messages
            data = await websocket.receive_text()
            # Echo back for heartbeat
            await websocket.send_text(f"pong: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, session_id)

@router.get("", response_model=List[LiveSession])
async def get_live_sessions(
    status: Optional[str] = None
):
    """Get all live sessions"""
    try:
        # Build query filter
        query_filter = {}
        if status:
            query_filter["status"] = status
        else:
            query_filter["status"] = {"$in": ["live", "paused"]}  # Default to active sessions
        
        # Execute query
        cursor = sport_live_sessions.find(query_filter, {"_id": 0}).sort([("created_at", -1)])
        sessions_data = await cursor.to_list(length=100)
        
        # Convert to LiveSession objects
        sessions = []
        for data in sessions_data:
            # Parse datetime fields
            if "created_at" in data and isinstance(data["created_at"], str):
                data["created_at"] = datetime.fromisoformat(data["created_at"])
            
            # Parse points timestamps
            for point in data.get("points", []):
                if "timestamp" in point and isinstance(point["timestamp"], str):
                    point["timestamp"] = datetime.fromisoformat(point["timestamp"])
            
            for point in data.get("all_points", []):
                if "timestamp" in point and isinstance(point["timestamp"], str):
                    point["timestamp"] = datetime.fromisoformat(point["timestamp"])
            
            sessions.append(LiveSession(**data))
        
        return sessions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live sessions: {str(e)}")

@router.get("/{session_id}", response_model=LiveSession)
async def get_live_session(session_id: str):
    """Get live session by ID"""
    try:
        session_data = await sport_live_sessions.find_one({"session_id": session_id}, {"_id": 0})
        if not session_data:
            raise HTTPException(status_code=404, detail="Live session not found")
        
        # Parse datetime fields
        if "created_at" in session_data and isinstance(session_data["created_at"], str):
            session_data["created_at"] = datetime.fromisoformat(session_data["created_at"])
        
        # Parse points timestamps
        for point in session_data.get("points", []):
            if "timestamp" in point and isinstance(point["timestamp"], str):
                point["timestamp"] = datetime.fromisoformat(point["timestamp"])
        
        for point in session_data.get("all_points", []):
            if "timestamp" in point and isinstance(point["timestamp"], str):
                point["timestamp"] = datetime.fromisoformat(point["timestamp"])
        
        return LiveSession(**session_data)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live session: {str(e)}")

@router.post("", response_model=LiveSession)
async def create_live_session(
    session_data: LiveSessionCreate,
    current_user = Depends(get_optional_user)
):
    """Start a new live session"""
    try:
        # Get player data
        player_a_data = await sport_players.find_one({"player_id": session_data.player_a_id})
        player_b_data = await sport_players.find_one({"player_id": session_data.player_b_id})
        
        if not player_a_data or not player_b_data:
            raise HTTPException(status_code=404, detail="One or both players not found")
        
        # Get referee data if provided
        referee = None
        if session_data.referee_id:
            referee_data = await sport_players.find_one({"player_id": session_data.referee_id})
            if referee_data:
                referee = PlayerSimple(
                    player_id=referee_data["player_id"],
                    nickname=referee_data["nickname"],
                    elo=referee_data["elo"],
                    photo_url=referee_data.get("avatar_url")
                )
        
        # Create live session
        session_id = f"live_{uuid.uuid4().hex[:8]}"
        session = LiveSession(
            session_id=session_id,
            player_a=PlayerSimple(
                player_id=player_a_data["player_id"],
                nickname=player_a_data["nickname"],
                elo=player_a_data["elo"],
                photo_url=player_a_data.get("avatar_url")
            ),
            player_b=PlayerSimple(
                player_id=player_b_data["player_id"],
                nickname=player_b_data["nickname"],
                elo=player_b_data["elo"],
                photo_url=player_b_data.get("avatar_url")
            ),
            referee=referee,
            league_id=session_data.league_id,
            tournament_id=session_data.tournament_id,
            stream_url=session_data.stream_url,
            settings=session_data.settings or LiveSessionSettings(),
            created_at=datetime.now(timezone.utc),
            timers=LiveSessionTimers(match_start=datetime.now(timezone.utc)),
            display=LiveSessionDisplay()
        )
        
        # Save to database
        doc = session.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["timers"]["match_start"]:
            doc["timers"]["match_start"] = doc["timers"]["match_start"].isoformat()
        
        await sport_live_sessions.insert_one(doc)
        
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create live session: {str(e)}")

@router.post("/{session_id}/score", response_model=Dict[str, Any])
async def score_point(
    session_id: str,
    point_data: ScorePoint,
    current_user = Depends(get_optional_user)
):
    """Score a point in live session"""
    try:
        # Get session
        session = await get_live_session(session_id)
        
        if session.status != "live":
            raise HTTPException(status_code=400, detail="Session is not live")
        
        if point_data.scored_by not in ["a", "b"]:
            raise HTTPException(status_code=400, detail="Invalid scored_by value")
        
        # Update score
        if point_data.scored_by == "a":
            session.score.a += 1
        else:
            session.score.b += 1
        
        # Create point record
        point = Point(
            num=len(session.points) + 1,
            set=session.current_set,
            scored_by=point_data.scored_by,
            score_after=ScoreState(a=session.score.a, b=session.score.b),
            technique=point_data.technique,
            server=session.server,
            timestamp=datetime.now(timezone.utc),
            streak=1,  # Will be calculated
            emotions=[],  # Will be calculated
            momentum=0.0  # Will be calculated
        )
        
        # Calculate streak, emotions, and momentum
        session.points.append(point)
        session.all_points.append(point)
        
        # Update streak
        streak_length = 1
        for p in reversed(session.points[:-1]):
            if p.scored_by == point_data.scored_by:
                streak_length += 1
            else:
                break
        point.streak = streak_length
        
        # Detect emotions
        emotions = detect_emotions(session.points, session.score, session.settings.model_dump())
        point.emotions = emotions
        
        # Calculate momentum
        point.momentum = calculate_momentum(session.points, point_data.scored_by)
        
        # Check if server should change
        should_change, new_server = should_change_server(
            session.points, session.server, session.settings.model_dump()
        )
        if should_change:
            session.server = new_server
        
        # Check if set is won
        points_to_win = session.settings.points_to_win
        min_lead = 2
        set_won = False
        set_winner = None
        
        if ((session.score.a >= points_to_win and session.score.a >= session.score.b + min_lead) or
            (session.score.b >= points_to_win and session.score.b >= session.score.a + min_lead)):
            set_won = True
            set_winner = "a" if session.score.a > session.score.b else "b"
        
        # Handle set completion
        if set_won:
            # Update sets won
            if set_winner == "a":
                session.sets_won.a += 1
            else:
                session.sets_won.b += 1
            
            # Add emotion for set win
            if "winner" not in point.emotions:
                point.emotions.append("winner")
            
            # Check if match is won
            if (session.sets_won.a >= session.settings.sets_to_win or 
                session.sets_won.b >= session.settings.sets_to_win):
                # Match is complete
                session.status = "completed"
                # Add final winner emotion
                if "winner" not in point.emotions:
                    point.emotions.append("winner")
            else:
                # Start new set
                session.current_set += 1
                session.score = ScoreState(a=0, b=0)
                session.points = []  # Reset points for new set
                # Add set start time
                if "set_starts" not in session.timers.model_dump():
                    session.timers.set_starts = []
                session.timers.set_starts.append(datetime.now(timezone.utc))
        
        # Update display info
        if emotions:
            session.display.last_emotion = emotions[-1]
            session.display.last_emotion_side = point_data.scored_by
            session.display.last_emotion_at = datetime.now(timezone.utc)
        
        # Save updated session
        doc = session.model_dump()
        # Convert datetime fields
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["timers"]["match_start"]:
            doc["timers"]["match_start"] = doc["timers"]["match_start"].isoformat()
        
        for i, start_time in enumerate(doc["timers"].get("set_starts", [])):
            if isinstance(start_time, datetime):
                doc["timers"]["set_starts"][i] = start_time.isoformat()
        
        for point_doc in doc["points"]:
            if isinstance(point_doc["timestamp"], datetime):
                point_doc["timestamp"] = point_doc["timestamp"].isoformat()
        
        for point_doc in doc["all_points"]:
            if isinstance(point_doc["timestamp"], datetime):
                point_doc["timestamp"] = point_doc["timestamp"].isoformat()
        
        if doc["display"]["last_emotion_at"]:
            doc["display"]["last_emotion_at"] = doc["display"]["last_emotion_at"].isoformat()
        
        await sport_live_sessions.replace_one({"session_id": session_id}, doc)
        
        # Broadcast update to WebSocket connections
        await manager.broadcast_to_session(session_id, {
            "type": "point_scored",
            "data": {
                "score": {"a": session.score.a, "b": session.score.b},
                "sets_won": {"a": session.sets_won.a, "b": session.sets_won.b},
                "server": session.server,
                "emotions": emotions,
                "status": session.status,
                "current_set": session.current_set,
                "point": point.model_dump()
            }
        })
        
        return {
            "message": "Point scored successfully",
            "score": {"a": session.score.a, "b": session.score.b},
            "sets_won": {"a": session.sets_won.a, "b": session.sets_won.b},
            "emotions": emotions,
            "status": session.status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to score point: {str(e)}")

@router.post("/{session_id}/undo", response_model=Dict[str, Any])
async def undo_last_point(
    session_id: str,
    current_user = Depends(get_optional_user)
):
    """Undo the last point scored"""
    try:
        # Get session
        session = await get_live_session(session_id)
        
        if not session.all_points:
            raise HTTPException(status_code=400, detail="No points to undo")
        
        # Get the last point
        last_point = session.all_points[-1]
        
        # Revert score
        if last_point.scored_by == "a":
            session.score.a = max(0, session.score.a - 1)
        else:
            session.score.b = max(0, session.score.b - 1)
        
        # Remove the last point
        session.all_points.pop()
        if session.points and session.points[-1].num == last_point.num:
            session.points.pop()
        
        # Reset session status if it was completed
        if session.status == "completed":
            session.status = "live"
        
        # Save updated session
        doc = session.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        if doc["timers"]["match_start"]:
            doc["timers"]["match_start"] = doc["timers"]["match_start"].isoformat()
        
        for point_doc in doc["points"]:
            if isinstance(point_doc["timestamp"], datetime):
                point_doc["timestamp"] = point_doc["timestamp"].isoformat()
        
        for point_doc in doc["all_points"]:
            if isinstance(point_doc["timestamp"], datetime):
                point_doc["timestamp"] = point_doc["timestamp"].isoformat()
        
        await sport_live_sessions.replace_one({"session_id": session_id}, doc)
        
        # Broadcast update
        await manager.broadcast_to_session(session_id, {
            "type": "point_undone",
            "data": {
                "score": {"a": session.score.a, "b": session.score.b},
                "sets_won": {"a": session.sets_won.a, "b": session.sets_won.b},
                "status": session.status
            }
        })
        
        return {
            "message": "Point undone successfully",
            "score": {"a": session.score.a, "b": session.score.b},
            "sets_won": {"a": session.sets_won.a, "b": session.sets_won.b},
            "status": session.status
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to undo point: {str(e)}")

@router.put("/{session_id}/referee", response_model=LiveSession)
async def update_referee(
    session_id: str,
    referee_data: RefereeUpdate,
    current_user = Depends(get_optional_user)
):
    """Update session referee"""
    try:
        # Get referee data
        referee_player = await sport_players.find_one({"player_id": referee_data.referee_id})
        if not referee_player:
            raise HTTPException(status_code=404, detail="Referee not found")
        
        # Update session
        await sport_live_sessions.update_one(
            {"session_id": session_id},
            {"$set": {
                "referee": {
                    "player_id": referee_player["player_id"],
                    "nickname": referee_player["nickname"],
                    "elo": referee_player["elo"],
                    "photo_url": referee_player.get("avatar_url")
                }
            }}
        )
        
        return await get_live_session(session_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update referee: {str(e)}")

@router.post("/{session_id}/end", response_model=LiveSession)
async def end_live_session(
    session_id: str,
    current_user = Depends(get_optional_user)
):
    """End the live session"""
    try:
        # Update session status
        await sport_live_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "completed"}}
        )
        
        session = await get_live_session(session_id)
        
        # Broadcast final update
        await manager.broadcast_to_session(session_id, {
            "type": "session_ended",
            "data": {"status": "completed"}
        })
        
        return session
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to end session: {str(e)}")
