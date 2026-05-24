from config import get_db
from utils.helpers import now_iso

def get_agent_deliveries(agent_id: str) -> list:
    db = get_db()
    orders = db.collection("orders").where("delivery_agent_id", "==", agent_id).stream()
    result = []
    for o in orders:
        data = o.to_dict()
        if data.get("status") in ["dispatched", "out_for_delivery", "confirmed"]:
            # Get customer info
            customer = db.collection("users").document(data["customer_id"]).get()
            cust_data = customer.to_dict() if customer.exists else {}
            data["customer_name"] = cust_data.get("name", "")
            data["customer_phone"] = cust_data.get("phone", "")
            result.append(data)
    return result

def update_delivery_status(order_id: str, status: str, agent_id: str) -> dict:
    db = get_db()
    db.collection("orders").document(order_id).update({
        "status": "delivered" if status == "delivered" else ("out_for_delivery" if status == "out_for_delivery" else status),
        "updated_at": now_iso()
    })
    delivery_ref = db.collection("deliveries").document(order_id)
    delivery = delivery_ref.get()
    if delivery.exists:
        update = {"status": status}
        if status == "delivered":
            update["delivered_at"] = now_iso()
        delivery_ref.update(update)
    else:
        # Create delivery session dynamically if it doesn't exist
        order_doc = db.collection("orders").document(order_id).get()
        order_data = order_doc.to_dict() if order_doc.exists else {}
        dest_lat = order_data.get("delivery_address", {}).get("lat", 23.0225)
        dest_lng = order_data.get("delivery_address", {}).get("lng", 72.5714)
        
        import random
        init_lat = dest_lat + random.uniform(-0.03, 0.03)
        init_lng = dest_lng + random.uniform(-0.03, 0.03)
        
        delivery_ref.set({
            "id": order_id,
            "order_id": order_id,
            "agent_id": agent_id,
            "status": "out_for_delivery" if status == "out_for_delivery" else status,
            "current_location": {"lat": init_lat, "lng": init_lng},
            "route": [],
            "estimated_time": "30 mins",
            "delivered_at": now_iso() if status == "delivered" else None,
            "rating": None,
            "created_at": now_iso()
        })
    # Update agent workload
    if status in ["delivered", "failed", "returned"]:
        agent_ref = db.collection("users").document(agent_id)
        agent = agent_ref.get()
        if agent.exists:
            wl = max(0, agent.to_dict().get("current_workload", 1) - 1)
            agent_ref.update({"current_workload": wl})
    return {"message": f"Delivery status updated to {status}"}

def rate_delivery(order_id: str, rating: int, comment: str = "") -> dict:
    db = get_db()
    delivery_ref = db.collection("deliveries").document(order_id)
    if delivery_ref.get().exists:
        delivery_ref.update({"rating": rating, "comment": comment})
    return {"message": "Rating submitted"}

def get_agent_earnings(agent_id: str) -> dict:
    db = get_db()
    deliveries = db.collection("orders").where("delivery_agent_id", "==", agent_id).where("status", "==", "delivered").stream()
    
    total_deliveries = 0
    total_earnings = 0
    available_balance = 0
    total_paid_out = 0
    
    for d in deliveries:
        data = d.to_dict()
        total_deliveries += 1
        total_earnings += 50
        
        if data.get("payout_status") == "paid":
            total_paid_out += 50
        else:
            available_balance += 50
            
    return {
        "total_deliveries": total_deliveries,
        "total_earnings": total_earnings,
        "available_balance": available_balance,
        "total_paid_out": total_paid_out,
        "per_delivery": 50
    }

def request_agent_payout(agent_id: str) -> dict:
    db = get_db()
    deliveries = db.collection("orders").where("delivery_agent_id", "==", agent_id).where("status", "==", "delivered").stream()
    
    unpaid_orders = []
    available_amount = 0
    
    for d in deliveries:
        data = d.to_dict()
        if data.get("payout_status") != "paid":
            unpaid_orders.append(d.id)
            available_amount += 50
            
    if available_amount == 0:
        return {"error": "No earnings available for cash out"}
        
    from utils.helpers import generate_id, generate_transaction_id
    payout_id = generate_id()
    transaction_id = "po_test_" + generate_transaction_id()
    
    # Update orders to paid
    batch = db.batch()
    for o_id in unpaid_orders:
        ref = db.collection("orders").document(o_id)
        batch.update(ref, {"payout_status": "paid", "payout_id": payout_id, "updated_at": now_iso()})
    batch.commit()
    
    # Create payout document
    payout = {
        "id": payout_id,
        "agent_id": agent_id,
        "amount": available_amount,
        "status": "succeeded",
        "stripe_transaction_id": transaction_id,
        "created_at": now_iso()
    }
    db.collection("payouts").document(payout_id).set(payout)
    
    return payout

def update_location(delivery_id: str, lat: float, lng: float) -> dict:
    db = get_db()
    ref = db.collection("deliveries").document(delivery_id)
    if ref.get().exists:
        ref.update({"current_location": {"lat": lat, "lng": lng}})
    return {"message": "Location updated"}

def get_agent_payouts(agent_id: str) -> list:
    db = get_db()
    payouts = db.collection("payouts").where("agent_id", "==", agent_id).stream()
    result = []
    for p in payouts:
        result.append(p.to_dict())
    return sorted(result, key=lambda x: x.get("created_at", ""), reverse=True)
