from fastapi import APIRouter, Depends, HTTPException
from utils.jwt_handler import verify_token
from services.delivery_service import request_agent_payout, get_agent_payouts

router = APIRouter()

@router.post("/payout")
async def agent_payout(user=Depends(verify_token)):
    if user.get("role") != "delivery_agent":
        raise HTTPException(status_code=403, detail="Only delivery agents can request payouts")
        
    result = request_agent_payout(user["uid"])
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
        
    return result

@router.get("/history")
async def payout_history(user=Depends(verify_token)):
    if user.get("role") != "delivery_agent":
        raise HTTPException(status_code=403, detail="Only delivery agents can view payout history")
        
    return get_agent_payouts(user["uid"])
