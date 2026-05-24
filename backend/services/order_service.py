from config import get_db
from utils.helpers import generate_id, now_iso, generate_transaction_id

def create_order(customer_id: str, data: dict) -> dict:
    db = get_db()
    order_id = generate_id()
    
    # Get business ID from the products in the order
    business_id = None
    if data.get("items"):
        first_prod_id = data["items"][0]["product_id"]
        prod_doc = db.collection("products").document(first_prod_id).get()
        if prod_doc.exists:
            business_id = prod_doc.to_dict().get("business_id")
            
    if business_id:
        owner_doc = db.collection("users").document(business_id).get()
        if owner_doc.exists:
            owner_data = owner_doc.to_dict()
            plan = owner_data.get("subscription_plan", "free")
            if plan == "free":
                from datetime import datetime, timezone
                now = datetime.now(timezone.utc)
                first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
                
                # Query all orders for this business and filter by date in Python to avoid composite index requirement
                all_business_orders = db.collection("orders").where("business_id", "==", business_id).stream()
                order_count = sum(
                    1 for o in all_business_orders 
                    if o.to_dict().get("created_at", "") >= first_of_month
                )
                if order_count >= 50:
                    raise ValueError("This store has reached its monthly order limit (50/month) on the Free plan. Please ask the owner to upgrade to Pro.")

    total = sum(item["price"] * item["quantity"] for item in data["items"])
    order = {
        "id": order_id,
        "customer_id": customer_id,
        "business_id": business_id,
        "items": [dict(i) for i in data["items"]],
        "total_amount": round(total, 2),
        "status": "placed",
        "payment_status": "paid",
        "payment_id": generate_transaction_id(),
        "delivery_agent_id": None,
        "delivery_address": data["delivery_address"],
        "created_at": now_iso(),
        "updated_at": now_iso()
    }
    db.collection("orders").document(order_id).set(order)
    # Decrease stock
    for item in data["items"]:
        prod_ref = db.collection("products").document(item["product_id"])
        prod = prod_ref.get()
        if prod.exists:
            new_stock = max(0, prod.to_dict().get("stock", 0) - item["quantity"])
            prod_ref.update({"stock": new_stock})
    # Add notification
    db.collection("notifications").add({
        "user_id": customer_id,
        "message": f"Order {order_id} placed successfully!",
        "type": "order",
        "read": False,
        "created_at": now_iso()
    })
    return order

def get_orders(user_id: str = None, role: str = None) -> list:
    db = get_db()
    query = db.collection("orders")
    if role == "customer" and user_id:
        query = query.where("customer_id", "==", user_id)
    elif role == "delivery_agent" and user_id:
        query = query.where("delivery_agent_id", "==", user_id)
    docs = query.stream()
    orders = [doc.to_dict() for doc in docs]
    orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return orders

def get_order(order_id: str) -> dict:
    db = get_db()
    doc = db.collection("orders").document(order_id).get()
    return doc.to_dict() if doc.exists else {"error": "Not found"}

def update_order_status(order_id: str, status: str) -> dict:
    db = get_db()
    db.collection("orders").document(order_id).update({
        "status": status,
        "updated_at": now_iso()
    })
    order = db.collection("orders").document(order_id).get().to_dict()
    if status == "dispatched" and order.get("delivery_agent_id"):
        # Make initial location dynamic: roughly 2-3km away from destination
        dest_lat = order.get("delivery_address", {}).get("lat", 23.0225)
        dest_lng = order.get("delivery_address", {}).get("lng", 72.5714)
        import random
        init_lat = dest_lat + random.uniform(-0.03, 0.03)
        init_lng = dest_lng + random.uniform(-0.03, 0.03)
        
        db.collection("deliveries").document(order_id).set({
            "id": order_id,
            "order_id": order_id,
            "agent_id": order["delivery_agent_id"],
            "status": "out_for_delivery",
            "current_location": {"lat": init_lat, "lng": init_lng},
            "route": [],
            "estimated_time": "30 mins",
            "delivered_at": None,
            "rating": None,
            "created_at": now_iso()
        })
    return order

def assign_agent(order_id: str, agent_id: str) -> dict:
    db = get_db()
    db.collection("orders").document(order_id).update({
        "delivery_agent_id": agent_id,
        "status": "confirmed",
        "updated_at": now_iso()
    })
    # Increment agent workload
    agent_ref = db.collection("users").document(agent_id)
    agent = agent_ref.get()
    if agent.exists:
        wl = agent.to_dict().get("current_workload", 0)
        agent_ref.update({"current_workload": wl + 1})
    return db.collection("orders").document(order_id).get().to_dict()

def process_return(order_id: str, reason: str) -> dict:
    db = get_db()
    order = db.collection("orders").document(order_id).get()
    if not order.exists:
        return {"error": "Order not found"}
    data = order.to_dict()
    from datetime import datetime, timezone
    try:
        created = datetime.fromisoformat(data["created_at"].replace("Z", "+00:00"))
        hours_diff = (datetime.now(timezone.utc) - created).total_seconds() / 3600
        if hours_diff > 24:
            return {"error": "Return window (24 hours) has expired"}
    except Exception:
        pass
    db.collection("orders").document(order_id).update({
        "status": "returned",
        "payment_status": "refund_pending",
        "return_reason": reason,
        "updated_at": now_iso()
    })
    return {"message": "Return processed", "order_id": order_id}

def issue_refund(order_id: str) -> dict:
    db = get_db()
    order_ref = db.collection("orders").document(order_id)
    order = order_ref.get()
    if not order.exists:
        return {"error": "Order not found"}
    data = order.to_dict()
    if data.get("status") != "returned":
        return {"error": "Refund is only allowed for returned orders"}
    if data.get("payment_status") == "refunded":
        return {"error": "Order has already been refunded"}
    
    refund_id = "re_test_" + generate_transaction_id()
    order_ref.update({
        "payment_status": "refunded",
        "refund_id": refund_id,
        "updated_at": now_iso()
    })
    return {"message": "Refund processed", "order_id": order_id, "refund_id": refund_id}
