from pydantic import BaseModel
from typing import Optional

class UserSignup(BaseModel):
    email: str
    password: str
    name: str
    role: str  # business_owner, delivery_agent, customer
    phone: Optional[str] = ""

class UserLogin(BaseModel):
    email: str
    password: str

class UserProfile(BaseModel):
    uid: str
    email: str
    name: str
    role: str
    phone: Optional[str] = ""
    location: Optional[dict] = None
    is_available: Optional[bool] = True
    current_workload: Optional[int] = 0
    created_at: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[dict] = None
    is_available: Optional[bool] = None
