from fastapi import APIRouter, HTTPException, Depends
from schemas.user import UserSignup, UserLogin, UserUpdate
from services.auth_service import signup_user, login_user, get_user_profile, update_user_profile, get_all_agents, get_all_customers
from utils.jwt_handler import verify_token

router = APIRouter()

@router.post("/signup")
async def signup(data: UserSignup):
    try:
        result = signup_user(data.email, data.password, data.name, data.role, data.phone)
        if "error" in result:
            raise HTTPException(status_code=400, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(data: UserLogin):
    result = login_user(data.email, data.password)
    if "error" in result:
        raise HTTPException(status_code=401, detail=result["error"])
    return result

@router.get("/profile")
async def profile(user=Depends(verify_token)):
    return get_user_profile(user["uid"])

@router.put("/profile")
async def update_profile(data: UserUpdate, user=Depends(verify_token)):
    update_dict = data.model_dump(exclude_none=True)
    return update_user_profile(user["uid"], update_dict)

@router.get("/agents")
async def list_agents(user=Depends(verify_token)):
    return get_all_agents()

@router.get("/customers")
async def list_customers(user=Depends(verify_token)):
    return get_all_customers()
