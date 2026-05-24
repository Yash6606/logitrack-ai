from fastapi import APIRouter, Depends
from services.analytics_service import get_dashboard_stats, get_daily_analytics, get_top_products, get_recent_activity
from utils.jwt_handler import verify_token

router = APIRouter()

@router.get("/dashboard")
async def dashboard(user=Depends(verify_token)):
    return get_dashboard_stats()

@router.get("/daily")
async def daily(days: int = 7, user=Depends(verify_token)):
    return get_daily_analytics(days)

@router.get("/top-products")
async def top_products(limit: int = 5, user=Depends(verify_token)):
    return get_top_products(limit)

@router.get("/activity")
async def activity(limit: int = 20, user=Depends(verify_token)):
    return get_recent_activity(limit)
