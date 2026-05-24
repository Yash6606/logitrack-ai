from pydantic import BaseModel
from typing import Optional

class DeliveryStatusUpdate(BaseModel):
    status: str  # out_for_delivery, delivered, failed, returned

class DeliveryRating(BaseModel):
    rating: int  # 1-5
    comment: Optional[str] = ""

class ReturnRequest(BaseModel):
    order_id: str
    reason: str

class LocationUpdate(BaseModel):
    lat: float
    lng: float
    delivery_id: str
