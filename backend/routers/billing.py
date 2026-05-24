from fastapi import APIRouter, Depends, HTTPException
from utils.jwt_handler import verify_token
from config import get_db
from datetime import datetime, timezone
from utils.helpers import now_iso, generate_transaction_id

router = APIRouter()

@router.get("/status")
async def billing_status(user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners have billing metrics")
        
    db = get_db()
    business_id = user["uid"]
    
    # Fetch user profile for plan details
    owner_doc = db.collection("users").document(business_id).get()
    if not owner_doc.exists:
        raise HTTPException(status_code=404, detail="User profile not found")
        
    owner_data = owner_doc.to_dict()
    plan = owner_data.get("subscription_plan", "free")
    
    # Calculate orders processed this month
    now = datetime.now(timezone.utc)
    first_of_month = datetime(now.year, now.month, 1, tzinfo=timezone.utc).isoformat()
    
    all_business_orders = db.collection("orders").where("business_id", "==", business_id).stream()
    order_count = sum(
        1 for o in all_business_orders 
        if o.to_dict().get("created_at", "") >= first_of_month
    )
    
    return {
        "subscription_plan": plan,
        "order_count_this_month": order_count,
        "max_orders": 50 if plan == "free" else -1
    }

@router.post("/upgrade")
async def upgrade_subscription(user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners can manage subscriptions")
        
    db = get_db()
    business_id = user["uid"]
    email = user.get("email", "")
    
    # Save the platform-level subscription payment transaction log
    txn_id = "sub_test_" + generate_transaction_id()
    db.collection("subscription_payments").add({
        "transaction_id": txn_id,
        "business_id": business_id,
        "email": email,
        "amount": 2499.00,
        "currency": "INR",
        "plan": "pro",
        "status": "succeeded",
        "created_at": now_iso()
    })
    
    db.collection("users").document(business_id).update({
        "subscription_plan": "pro",
        "updated_at": now_iso()
    })
    
    # Log notification
    db.collection("notifications").add({
        "user_id": business_id,
        "message": "Congratulations! Your subscription has been successfully upgraded to Pro (unlimited orders).",
        "type": "billing",
        "read": False,
        "created_at": now_iso()
    })
    
    return {"message": "Successfully upgraded to Pro", "subscription_plan": "pro"}

@router.post("/downgrade")
async def downgrade_subscription(user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners can manage subscriptions")
        
    db = get_db()
    business_id = user["uid"]
    
    db.collection("users").document(business_id).update({
        "subscription_plan": "free",
        "updated_at": now_iso()
    })
    
    # Log notification
    db.collection("notifications").add({
        "user_id": business_id,
        "message": "Your subscription has been downgraded to the Free tier (50 orders/month).",
        "type": "billing",
        "read": False,
        "created_at": now_iso()
    })
    
    return {"message": "Successfully downgraded to Free", "subscription_plan": "free"}

@router.get("/saas-metrics")
async def saas_metrics(user=Depends(verify_token)):
    if user.get("role") != "saas_admin":
        raise HTTPException(status_code=403, detail="Access denied. Only system SaaS super-admins are allowed.")
        
    db = get_db()
    
    # 1. Query all users to aggregate metrics
    users_stream = db.collection("users").stream()
    
    business_owners = []
    agents_count = 0
    customers_count = 0
    pro_owners_count = 0
    free_owners_count = 0
    
    for u in users_stream:
        u_data = u.to_dict()
        role = u_data.get("role")
        if role == "business_owner":
            plan = u_data.get("subscription_plan", "free")
            business_owners.append({
                "uid": u_data.get("uid"),
                "email": u_data.get("email"),
                "name": u_data.get("name"),
                "subscription_plan": plan,
                "phone": u_data.get("phone", ""),
                "created_at": u_data.get("created_at")
            })
            if plan == "pro":
                pro_owners_count += 1
            else:
                free_owners_count += 1
        elif role == "delivery_agent":
            agents_count += 1
        elif role == "customer":
            customers_count += 1
            
    # 2. Query subscription payments and sum revenue
    payments_stream = db.collection("subscription_payments").stream()
    payments = []
    total_revenue = 0.0
    
    for p in payments_stream:
        p_data = p.to_dict()
        payments.append({
            "transaction_id": p_data.get("transaction_id"),
            "business_id": p_data.get("business_id"),
            "email": p_data.get("email"),
            "amount": p_data.get("amount", 0.0),
            "currency": p_data.get("currency", "INR"),
            "plan": p_data.get("plan", "pro"),
            "status": p_data.get("status"),
            "created_at": p_data.get("created_at")
        })
        if p_data.get("status") == "succeeded":
            total_revenue += float(p_data.get("amount", 0.0))
            
    # Sort payments by created_at descending if present
    payments.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "metrics": {
            "total_owners": len(business_owners),
            "total_agents": agents_count,
            "total_customers": customers_count,
            "pro_owners": pro_owners_count,
            "free_owners": free_owners_count,
            "total_revenue": total_revenue
        },
        "owners": business_owners,
        "payments": payments
    }

