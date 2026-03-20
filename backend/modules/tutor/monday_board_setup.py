"""
Create the "Tutor School Feed" board on Monday.com with proper columns.
Run once to set up the board structure.
"""
from fastapi import APIRouter, Depends, HTTPException
from core.database import db
from core.auth import get_admin_user
import logging

logger = logging.getLogger("tutor.monday_board_setup")
router = APIRouter(prefix="/tutor/setup-monday-board", tags=["Tutor - Monday Setup"])


@router.post("")
async def create_school_feed_board(admin: dict = Depends(get_admin_user)):
    """Create the Tutor School Feed board on Monday.com with recommended columns."""
    from modules.integrations.monday.core_client import monday_client

    # Step 1: Create board
    create_board_query = '''mutation { create_board (board_name: "Tutor School Feed", board_kind: public) { id } }'''
    result = await monday_client.execute(create_board_query)
    board_data = result.get("data", result).get("create_board", result.get("create_board", {}))
    board_id = str(board_data.get("id", ""))
    if not board_id:
        raise HTTPException(500, f"Failed to create board: {result}")
    
    logger.info(f"Created Monday board: {board_id}")

    # Step 2: Create columns
    columns = [
        ("student_name", "Student", "text"),
        ("feed_date", "Date", "date"),
        ("feed_type", "Type", "status"),
        ("subject", "Subject", "text"),
        ("content", "Content", "long_text"),
        ("urgency", "Urgency", "status"),
        ("due_date", "Due Date", "date"),
        ("action_required", "Action Required", "text"),
        ("source", "Source", "text"),
        ("feed_status", "Status", "status"),
        ("parent_notified", "Parent Notified", "checkbox"),
    ]

    column_ids = {}
    for col_id, col_title, col_type in columns:
        try:
            q = f'''mutation {{ create_column (board_id: {board_id}, title: "{col_title}", column_type: {col_type}) {{ id title }} }}'''
            r = await monday_client.execute(q)
            col_data = r.get("data", r).get("create_column", r.get("create_column", {}))
            created_id = col_data.get("id", col_id)
            column_ids[col_id] = created_id
            logger.info(f"  Column: {col_title} → {created_id}")
        except Exception as e:
            logger.warning(f"  Column {col_title} failed: {e}")
            column_ids[col_id] = col_id

    # Step 3: Create groups for organization
    groups = ["This Week", "Previous", "Archived"]
    for group_name in groups:
        try:
            q = f'''mutation {{ create_group (board_id: {board_id}, group_name: "{group_name}") {{ id }} }}'''
            await monday_client.execute(q)
        except Exception as e:
            logger.warning(f"  Group {group_name}: {e}")

    # Step 4: Save board mapping to school feed config
    await db["tutor_school_feed_config"].update_one(
        {"_id": "school_feed_config"},
        {"$set": {
            "monday_board.enabled": True,
            "monday_board.board_id": board_id,
            "monday_board.board_name": "Tutor School Feed",
            "monday_board.column_map": column_ids,
        }},
        upsert=True
    )

    return {
        "success": True,
        "board_id": board_id,
        "board_url": f"https://chipilink-club.monday.com/boards/{board_id}",
        "columns_created": column_ids,
        "message": "Board created! Go to Monday.com to see it. Column mapping saved to config."
    }
