from fastapi import APIRouter, Depends, Body, BackgroundTasks, HTTPException
from ai.demand_forecast import forecast_demand, train_demand_model
from ai.auto_assign import auto_assign_agent
from ai.churn_predictor import predict_churn, train_churn_model
from utils.jwt_handler import verify_token
import time

router = APIRouter()

_cache = {}
CACHE_TTL = 300  # 5 minutes cache for heavy AI queries

def _get_cached(key):
    if key in _cache and time.time() - _cache[key]["time"] < CACHE_TTL:
        return _cache[key]["data"]
    return None

def _set_cached(key, data):
    _cache[key] = {"time": time.time(), "data": data}

def _clear_cache():
    _cache.clear()

def run_retrain_bg():
    print("[Background ML Task] Starting async retraining...")
    try:
        train_demand_model()
    except Exception as e:
        print(f"[Background ML Task] Error training demand model: {e}")
    try:
        train_churn_model()
    except Exception as e:
        print(f"[Background ML Task] Error training churn model: {e}")
    print("[Background ML Task] Async retraining complete.")

@router.get("/demand-forecast")
async def demand_forecast(user=Depends(verify_token)):
    cached = _get_cached("demand")
    if cached: return cached
    res = forecast_demand()
    _set_cached("demand", res)
    return res

@router.post("/auto-assign")
async def auto_assign(pickup_location: dict = Body(...), user=Depends(verify_token)):
    return auto_assign_agent(pickup_location)

@router.get("/churn-prediction")
async def churn_prediction(user=Depends(verify_token)):
    cached = _get_cached("churn")
    if cached: return cached
    res = predict_churn()
    _set_cached("churn", res)
    return res

@router.post("/retrain")
async def retrain_models(background_tasks: BackgroundTasks, user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners/admins can trigger retraining.")
    
    # Clear the API cache so new predictions load instantly
    _clear_cache()
    
    # Queue background task
    background_tasks.add_task(run_retrain_bg)
    return {"message": "Model retraining successfully queued in background."}
