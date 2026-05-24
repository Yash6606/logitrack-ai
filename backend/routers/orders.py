from fastapi import APIRouter, Depends, HTTPException
from schemas.order import OrderCreate, OrderStatusUpdate, OrderAssignAgent
from services.order_service import create_order, get_orders, get_order, update_order_status, assign_agent, process_return, issue_refund
from schemas.delivery import ReturnRequest
from utils.jwt_handler import verify_token

router = APIRouter()

@router.get("/")
async def list_orders(user=Depends(verify_token)):
    return get_orders(user["uid"], user["role"])

@router.get("/{order_id}")
async def read_order(order_id: str, user=Depends(verify_token)):
    result = get_order(order_id)
    if isinstance(result, dict) and "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/")
async def place_order(data: OrderCreate, user=Depends(verify_token)):
    if user.get("role") != "customer":
        raise HTTPException(status_code=403, detail="Only customers can place orders")
    items = [i.model_dump() for i in data.items]
    try:
        return create_order(user["uid"], {"items": items, "delivery_address": data.delivery_address})
    except ValueError as e:
        raise HTTPException(status_code=403, detail=str(e))

@router.put("/{order_id}/status")
async def change_status(order_id: str, data: OrderStatusUpdate, user=Depends(verify_token)):
    return update_order_status(order_id, data.status)

@router.put("/{order_id}/assign")
async def assign_delivery_agent(order_id: str, data: OrderAssignAgent, user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners can assign agents")
    return assign_agent(order_id, data.agent_id)

@router.post("/{order_id}/return")
async def return_order(order_id: str, data: ReturnRequest, user=Depends(verify_token)):
    result = process_return(order_id, data.reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/{order_id}/refund")
async def refund_order(order_id: str, user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners can refund orders")
    result = issue_refund(order_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

