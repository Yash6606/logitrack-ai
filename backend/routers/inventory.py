from fastapi import APIRouter, Depends
from services.product_service import get_inventory_history, get_low_stock
from utils.jwt_handler import verify_token

router = APIRouter()

@router.get("/history")
async def inventory_history(product_id: str = None, user=Depends(verify_token)):
    return get_inventory_history(product_id)

@router.get("/alerts")
async def inventory_alerts(threshold: int = 10, user=Depends(verify_token)):
    return get_low_stock(threshold)
