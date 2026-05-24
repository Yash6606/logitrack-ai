from config import get_db
from datetime import datetime, timedelta, timezone
import time

_cache = {}
CACHE_TTL = 60  # 60 seconds cache to save Firebase quota

def _get_cached(key):
    if key in _cache and time.time() - _cache[key]["time"] < CACHE_TTL:
        return _cache[key]["data"]
    return None

def _set_cached(key, data):
    _cache[key] = {"time": time.time(), "data": data}

def get_dashboard_stats() -> dict:
    cached = _get_cached("dashboard_stats")
    if cached: return cached

    db = get_db()
    orders = list(db.collection("orders").stream())
    total_orders = len(orders)
    total_revenue = sum(o.to_dict().get("total_amount", 0) for o in orders)
    pending = sum(1 for o in orders if o.to_dict().get("status") in ["placed", "confirmed", "dispatched", "out_for_delivery"])
    delivered = sum(1 for o in orders if o.to_dict().get("status") == "delivered")
    returned = sum(1 for o in orders if o.to_dict().get("status") == "returned")

    low_stock = len(list(db.collection("products").where("stock", "<=", 10).stream()))

    result = {
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "pending_deliveries": pending,
        "delivered_orders": delivered,
        "returned_orders": returned,
        "low_stock_count": low_stock,
        "delivery_success_rate": round((delivered / max(total_orders, 1)) * 100, 1),
        "return_rate": round((returned / max(total_orders, 1)) * 100, 1)
    }
    _set_cached("dashboard_stats", result)
    return result

def get_daily_analytics(days: int = 7) -> list:
    cache_key = f"daily_analytics_{days}"
    cached = _get_cached(cache_key)
    if cached: return cached

    db = get_db()
    now = datetime.now(timezone.utc)
    daily = []
    for i in range(days - 1, -1, -1):
        day = (now - timedelta(days=i))
        day_str = day.strftime("%Y-%m-%d")
        start = day.replace(hour=0, minute=0, second=0).isoformat()
        end = day.replace(hour=23, minute=59, second=59).isoformat()
        orders = list(db.collection("orders").where("created_at", ">=", start).where("created_at", "<=", end).stream())
        revenue = sum(o.to_dict().get("total_amount", 0) for o in orders)
        daily.append({"date": day_str, "orders": len(orders), "revenue": round(revenue, 2)})
    
    _set_cached(cache_key, daily)
    return daily

def get_top_products(limit: int = 5) -> list:
    cache_key = f"top_products_{limit}"
    cached = _get_cached(cache_key)
    if cached: return cached

    db = get_db()
    orders = db.collection("orders").stream()
    product_sales = {}
    for o in orders:
        for item in o.to_dict().get("items", []):
            pid = item.get("product_id")
            product_sales.setdefault(pid, {"name": item.get("product_name", ""), "quantity": 0, "revenue": 0})
            product_sales[pid]["quantity"] += item.get("quantity", 0)
            product_sales[pid]["revenue"] += item.get("price", 0) * item.get("quantity", 0)
    sorted_products = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)
    
    result = sorted_products[:limit]
    _set_cached(cache_key, result)
    return result

def get_recent_activity(limit: int = 20) -> list:
    cache_key = f"recent_activity_{limit}"
    cached = _get_cached(cache_key)
    if cached: return cached

    db = get_db()
    notifications = db.collection("notifications").order_by("created_at", direction="DESCENDING").limit(limit).stream()
    result = [n.to_dict() for n in notifications]
    _set_cached(cache_key, result)
    return result
