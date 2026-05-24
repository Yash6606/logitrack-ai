"""Seed Firestore with demo data for LogiTrack AI."""
import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from config import init_firebase, get_db
from utils.helpers import generate_id, now_iso, generate_transaction_id
from datetime import datetime, timedelta, timezone
import random

AHMEDABAD_LOCATIONS = [
    {"name": "Navrangpura", "lat": 23.0362, "lng": 72.5611},
    {"name": "Satellite", "lat": 23.0155, "lng": 72.5270},
    {"name": "Vastrapur", "lat": 23.0308, "lng": 72.5294},
    {"name": "Bopal", "lat": 23.0340, "lng": 72.4680},
    {"name": "Maninagar", "lat": 23.0006, "lng": 72.6043},
    {"name": "SG Highway", "lat": 23.0469, "lng": 72.5174},
    {"name": "CG Road", "lat": 23.0263, "lng": 72.5660},
    {"name": "Paldi", "lat": 23.0120, "lng": 72.5620},
    {"name": "Gurukul", "lat": 23.0413, "lng": 72.5462},
    {"name": "Thaltej", "lat": 23.0540, "lng": 72.5000},
]

DEMO_USERS = [
    {"email": "owner@logitrack.ai", "password": "demo1234", "name": "Raj Patel", "role": "business_owner", "phone": "+91 98765 43210"},
    {"email": "agent1@logitrack.ai", "password": "demo1234", "name": "Amit Shah", "role": "delivery_agent", "phone": "+91 98765 43211"},
    {"email": "agent2@logitrack.ai", "password": "demo1234", "name": "Vikram Singh", "role": "delivery_agent", "phone": "+91 98765 43212"},
    {"email": "agent3@logitrack.ai", "password": "demo1234", "name": "Suresh Kumar", "role": "delivery_agent", "phone": "+91 98765 43213"},
    {"email": "customer@logitrack.ai", "password": "demo1234", "name": "Priya Sharma", "role": "customer", "phone": "+91 98765 43214"},
    {"email": "customer2@logitrack.ai", "password": "demo1234", "name": "Neha Gupta", "role": "customer", "phone": "+91 98765 43215"},
    {"email": "customer3@logitrack.ai", "password": "demo1234", "name": "Arjun Mehta", "role": "customer", "phone": "+91 98765 43216"},
]

DEMO_PRODUCTS = [
    {"name": "Wireless Earbuds Pro", "description": "Premium wireless earbuds with noise cancellation", "price": 2499, "stock": 45, "sku": "ELEC-001", "category": "Electronics", "image_url": ""},
    {"name": "Smart Watch X200", "description": "Fitness tracker with heart rate monitoring", "price": 4999, "stock": 30, "sku": "ELEC-002", "category": "Electronics", "image_url": ""},
    {"name": "Organic Green Tea", "description": "Premium organic green tea, 100 bags", "price": 349, "stock": 8, "sku": "GROC-001", "category": "Groceries", "image_url": ""},
    {"name": "Basmati Rice 5kg", "description": "Premium aged basmati rice", "price": 599, "stock": 5, "sku": "GROC-002", "category": "Groceries", "image_url": ""},
    {"name": "Cotton T-Shirt", "description": "Premium cotton round neck t-shirt", "price": 799, "stock": 60, "sku": "FASH-001", "category": "Fashion", "image_url": ""},
    {"name": "Leather Wallet", "description": "Genuine leather bifold wallet", "price": 1299, "stock": 25, "sku": "FASH-002", "category": "Fashion", "image_url": ""},
    {"name": "USB-C Cable 2m", "description": "Fast charging braided USB-C cable", "price": 299, "stock": 3, "sku": "ELEC-003", "category": "Electronics", "image_url": ""},
    {"name": "Hand Sanitizer 500ml", "description": "Alcohol-based hand sanitizer", "price": 149, "stock": 100, "sku": "HLTH-001", "category": "Health", "image_url": ""},
    {"name": "Notebook Set (5 pcs)", "description": "A5 ruled notebooks, premium quality", "price": 249, "stock": 40, "sku": "STAT-001", "category": "Stationery", "image_url": ""},
    {"name": "Bluetooth Speaker", "description": "Portable waterproof bluetooth speaker", "price": 1999, "stock": 15, "sku": "ELEC-004", "category": "Electronics", "image_url": ""},
    {"name": "Masala Chai Mix", "description": "Authentic Indian masala chai blend 200g", "price": 199, "stock": 7, "sku": "GROC-003", "category": "Groceries", "image_url": ""},
    {"name": "Running Shoes", "description": "Lightweight running shoes with cushioning", "price": 2999, "stock": 20, "sku": "FASH-003", "category": "Fashion", "image_url": ""},
    {"name": "Phone Case Universal", "description": "Shockproof transparent phone case", "price": 399, "stock": 50, "sku": "ELEC-005", "category": "Electronics", "image_url": ""},
    {"name": "Almond Butter 400g", "description": "Natural almond butter, no added sugar", "price": 649, "stock": 12, "sku": "GROC-004", "category": "Groceries", "image_url": ""},
    {"name": "Yoga Mat Premium", "description": "Non-slip yoga mat, 6mm thick", "price": 899, "stock": 18, "sku": "HLTH-002", "category": "Health", "image_url": ""},
]

def seed():
    init_firebase()
    db = get_db()
    print("🌱 Seeding LogiTrack AI database...")

    # Create users
    user_ids = {}
    for u in DEMO_USERS:
        try:
            user = fb_auth.create_user(email=u["email"], password=u["password"], display_name=u["name"])
            uid = user.uid
        except Exception as e:
            if "ALREADY_EXISTS" in str(e) or "already exists" in str(e).lower():
                user = fb_auth.get_user_by_email(u["email"])
                uid = user.uid
            else:
                print(f"  ⚠ Error creating {u['email']}: {e}")
                continue

        loc = random.choice(AHMEDABAD_LOCATIONS)
        user_data = {
            "uid": uid, "email": u["email"], "name": u["name"], "role": u["role"],
            "phone": u["phone"],
            "location": {"lat": loc["lat"] + random.uniform(-0.005, 0.005), "lng": loc["lng"] + random.uniform(-0.005, 0.005)},
            "is_available": True, "current_workload": 0,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=random.randint(30, 90))).isoformat()
        }
        db.collection("users").document(uid).set(user_data)
        user_ids[u["email"]] = uid
        print(f"  ✅ User: {u['email']} ({u['role']})")

    # Create products
    product_ids = []
    owner_id = user_ids.get("owner@logitrack.ai", "owner")
    for p in DEMO_PRODUCTS:
        pid = generate_id()
        product = {**p, "id": pid, "business_id": owner_id, "created_at": now_iso()}
        db.collection("products").document(pid).set(product)
        product_ids.append({"id": pid, "name": p["name"], "price": p["price"]})
        print(f"  📦 Product: {p['name']}")

    # Create historical orders (30 days)
    customer_emails = ["customer@logitrack.ai", "customer2@logitrack.ai", "customer3@logitrack.ai"]
    agent_emails = ["agent1@logitrack.ai", "agent2@logitrack.ai", "agent3@logitrack.ai"]
    statuses = ["delivered", "delivered", "delivered", "delivered", "returned"]  # 80% success

    print("  📋 Creating 30 days of order history...")
    for day_offset in range(30, 0, -1):
        day = datetime.now(timezone.utc) - timedelta(days=day_offset)
        num_orders = random.randint(2, 6)
        for _ in range(num_orders):
            num_items = random.randint(1, 3)
            items = []
            for __ in range(num_items):
                prod = random.choice(product_ids)
                qty = random.randint(1, 3)
                items.append({"product_id": prod["id"], "product_name": prod["name"], "quantity": qty, "price": prod["price"]})
            total = sum(i["price"] * i["quantity"] for i in items)
            cust_email = random.choice(customer_emails)
            agent_email = random.choice(agent_emails)
            loc = random.choice(AHMEDABAD_LOCATIONS)
            status = random.choice(statuses)
            order_id = generate_id()
            order = {
                "id": order_id,
                "customer_id": user_ids.get(cust_email, "cust"),
                "items": items,
                "total_amount": round(total, 2),
                "status": status,
                "payment_status": "refunded" if status == "returned" else "paid",
                "payment_id": generate_transaction_id(),
                "delivery_agent_id": user_ids.get(agent_email, "agent"),
                "delivery_address": {"address": f"{loc['name']}, Ahmedabad", "lat": loc["lat"], "lng": loc["lng"]},
                "created_at": (day + timedelta(hours=random.randint(8, 20))).isoformat(),
                "updated_at": (day + timedelta(hours=random.randint(20, 23))).isoformat()
            }
            db.collection("orders").document(order_id).set(order)

    # Create a few active orders for demo
    print("  🚚 Creating active demo orders...")
    active_statuses = ["placed", "confirmed", "dispatched", "out_for_delivery"]
    for i, status in enumerate(active_statuses):
        prod = random.choice(product_ids)
        loc = AHMEDABAD_LOCATIONS[i % len(AHMEDABAD_LOCATIONS)]
        dest = AHMEDABAD_LOCATIONS[(i + 3) % len(AHMEDABAD_LOCATIONS)]
        cust_id = user_ids.get(customer_emails[i % len(customer_emails)], "cust")
        agent_id = user_ids.get(agent_emails[i % len(agent_emails)], "agent")
        order_id = generate_id()
        order = {
            "id": order_id,
            "customer_id": cust_id,
            "items": [{"product_id": prod["id"], "product_name": prod["name"], "quantity": 1, "price": prod["price"]}],
            "total_amount": prod["price"],
            "status": status,
            "payment_status": "paid",
            "payment_id": generate_transaction_id(),
            "delivery_agent_id": agent_id if status in ["dispatched", "out_for_delivery"] else None,
            "delivery_address": {"address": f"{dest['name']}, Ahmedabad", "lat": dest["lat"], "lng": dest["lng"]},
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        db.collection("orders").document(order_id).set(order)

        if status in ["dispatched", "out_for_delivery"]:
            db.collection("deliveries").document(order_id).set({
                "id": order_id, "order_id": order_id, "agent_id": agent_id,
                "status": "out_for_delivery",
                "current_location": {"lat": loc["lat"], "lng": loc["lng"]},
                "route": [], "estimated_time": "25 mins",
                "delivered_at": None, "rating": None, "created_at": now_iso()
            })

    # Notifications
    for cust_email in customer_emails:
        cid = user_ids.get(cust_email, "")
        if cid:
            db.collection("notifications").add({
                "user_id": cid, "message": "Welcome to LogiTrack AI! Start shopping now.",
                "type": "info", "read": False, "created_at": now_iso()
            })

    print("\n✅ Seeding complete!")
    print("\n📧 Demo Accounts:")
    print("   Business Owner: owner@logitrack.ai / demo1234")
    print("   Delivery Agent: agent1@logitrack.ai / demo1234")
    print("   Customer:       customer@logitrack.ai / demo1234")

if __name__ == "__main__":
    seed()
