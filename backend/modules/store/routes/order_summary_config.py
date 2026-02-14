"""
Order Summary Config — Admin-configurable sections for the order summary preview modal.
Controls which sections appear in the confirmation modal before textbook order submission.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from core.database import db
from modules.auth.dependencies import get_current_user, require_admin

router = APIRouter(prefix="/api/store/order-summary-config", tags=["Order Summary Config"])

COLLECTION = "order_summary_config"
CONFIG_ID = "default"


class OrderSummaryConfig(BaseModel):
    show_student_info: bool = True
    show_book_list: bool = True
    show_form_data: bool = True
    show_wallet_balance: bool = True
    show_total: bool = True


class UpdateOrderSummaryConfig(BaseModel):
    show_student_info: Optional[bool] = None
    show_book_list: Optional[bool] = None
    show_form_data: Optional[bool] = None
    show_wallet_balance: Optional[bool] = None
    show_total: Optional[bool] = None


async def _get_config() -> dict:
    doc = await db[COLLECTION].find_one({"config_id": CONFIG_ID}, {"_id": 0})
    if not doc:
        defaults = OrderSummaryConfig().model_dump()
        defaults["config_id"] = CONFIG_ID
        await db[COLLECTION].insert_one(defaults)
        return {k: v for k, v in defaults.items() if k != "config_id"}
    return {k: v for k, v in doc.items() if k != "config_id"}


@router.get("")
async def get_order_summary_config():
    """Public: returns which sections to show in the order summary modal."""
    return await _get_config()


@router.put("")
async def update_order_summary_config(
    body: UpdateOrderSummaryConfig,
    current_user=Depends(require_admin),
):
    """Admin: update order summary modal configuration."""
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if updates:
        await db[COLLECTION].update_one(
            {"config_id": CONFIG_ID},
            {"$set": updates},
            upsert=True,
        )
    return await _get_config()
