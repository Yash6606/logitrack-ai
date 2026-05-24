from config import get_db, get_auth
from utils.helpers import now_iso
from utils.jwt_handler import create_token

def signup_user(email: str, password: str, name: str, role: str, phone: str = "") -> dict:
    auth = get_auth()
    db = get_db()
    user = auth.create_user(email=email, password=password, display_name=name)
    user_data = {
        "uid": user.uid,
        "email": email,
        "name": name,
        "role": role,
        "phone": phone,
        "location": {"lat": 23.0225, "lng": 72.5714},
        "is_available": True,
        "current_workload": 0,
        "created_at": now_iso()
    }
    db.collection("users").document(user.uid).set(user_data)
    token = create_token({"uid": user.uid, "email": email, "role": role, "name": name})
    return {"token": token, "user": user_data}

def login_user(email: str, password: str) -> dict:
    import httpx
    import os
    db = get_db()
    
    # Special intercept for Master SaaS Admin bypass
    normalized_email = email.strip().lower()
    if (normalized_email == "master" or normalized_email == "master@logitrack.ai") and password == "master":
        uid = "master_admin"
        doc_ref = db.collection("users").document(uid)
        user_doc = doc_ref.get()
        if not user_doc.exists:
            user_data = {
                "uid": uid,
                "email": "master@logitrack.ai",
                "name": "Master Admin",
                "role": "saas_admin",
                "created_at": now_iso()
            }
            doc_ref.set(user_data)
        else:
            user_data = user_doc.to_dict()
        token = create_token({"uid": uid, "email": "master@logitrack.ai", "role": "saas_admin", "name": user_data.get("name", "Master Admin")})
        return {"token": token, "user": user_data}

    API_KEY = os.getenv("FIREBASE_API_KEY", "AIzaSyCK5pwUS_puhAkMyU0J-_JimQjkUf18Z8w")
    url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={API_KEY}"
    resp = httpx.post(url, json={"email": email, "password": password, "returnSecureToken": True})
    if resp.status_code != 200:
        return {"error": "Invalid credentials"}
    uid = resp.json()["localId"]
    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        return {"error": "User profile not found"}
    user_data = user_doc.to_dict()
    token = create_token({"uid": uid, "email": email, "role": user_data["role"], "name": user_data.get("name", "")})
    return {"token": token, "user": user_data}

def get_user_profile(uid: str) -> dict:
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if doc.exists:
        return doc.to_dict()
    return {"error": "User not found"}

def update_user_profile(uid: str, data: dict) -> dict:
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    if update_data:
        db.collection("users").document(uid).update(update_data)
    doc = db.collection("users").document(uid).get()
    return doc.to_dict()

def get_all_agents() -> list:
    db = get_db()
    agents = db.collection("users").where("role", "==", "delivery_agent").stream()
    return [a.to_dict() for a in agents]

def get_all_customers() -> list:
    db = get_db()
    customers = db.collection("users").where("role", "==", "customer").stream()
    return [c.to_dict() for c in customers]
