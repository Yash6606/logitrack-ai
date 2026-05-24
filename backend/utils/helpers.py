import math
import uuid
from datetime import datetime, timezone

def generate_id() -> str:
    return str(uuid.uuid4())[:8]

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in km."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def generate_transaction_id() -> str:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return f"TXN-{ts}-{uuid.uuid4().hex[:6].upper()}"

def interpolate_points(start: dict, end: dict, steps: int = 20) -> list:
    """Generate intermediate GPS points between start and end."""
    points = []
    for i in range(steps + 1):
        t = i / steps
        lat = start["lat"] + t * (end["lat"] - start["lat"])
        lng = start["lng"] + t * (end["lng"] - start["lng"])
        points.append({"lat": round(lat, 6), "lng": round(lng, 6)})
    return points
