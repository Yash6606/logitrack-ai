from pydantic import BaseModel
from typing import Optional, List

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    price: float

class OrderCreate(BaseModel):
    items: List[OrderItem]
    delivery_address: dict  # {address, lat, lng}
    payment_method: Optional[str] = "dummy_card"

class OrderStatusUpdate(BaseModel):
    status: str  # placed, confirmed, dispatched, out_for_delivery, delivered

class OrderAssignAgent(BaseModel):
    agent_id: str
