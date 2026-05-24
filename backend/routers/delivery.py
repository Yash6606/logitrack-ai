from fastapi import APIRouter, Depends
from schemas.delivery import DeliveryStatusUpdate, DeliveryRating, LocationUpdate
from services.delivery_service import get_agent_deliveries, update_delivery_status, rate_delivery, get_agent_earnings, update_location
from utils.jwt_handler import verify_token

router = APIRouter()

@router.get("/my-deliveries")
async def my_deliveries(user=Depends(verify_token)):
    if user.get("role") != "delivery_agent":
        return {"error": "Not a delivery agent"}
    return get_agent_deliveries(user["uid"])

@router.put("/{order_id}/status")
async def change_delivery_status(order_id: str, data: DeliveryStatusUpdate, user=Depends(verify_token)):
    return update_delivery_status(order_id, data.status, user["uid"])

@router.post("/{order_id}/rate")
async def rate(order_id: str, data: DeliveryRating, user=Depends(verify_token)):
    return rate_delivery(order_id, data.rating, data.comment)

@router.get("/earnings")
async def earnings(user=Depends(verify_token)):
    return get_agent_earnings(user["uid"])

@router.post("/location")
async def location(data: LocationUpdate, user=Depends(verify_token)):
    return update_location(data.delivery_id, data.lat, data.lng)
