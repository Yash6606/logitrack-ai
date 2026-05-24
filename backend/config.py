import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
import os

JWT_SECRET = os.getenv("JWT_SECRET", "logitrack-ai-secret-key-2024")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

FIREBASE_STORAGE_BUCKET = "logitrack-ai-9a835.firebasestorage.app"

def init_firebase():
    if not firebase_admin._apps:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 1. First, check if credentials are passed as an environment JSON string (Standard Production Cloud Practice)
        env_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if env_json:
            try:
                import json
                cred_dict = json.loads(env_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred, {"storageBucket": FIREBASE_STORAGE_BUCKET})
                print("[Firebase] Initialized in production using FIREBASE_SERVICE_ACCOUNT_JSON environment variable.")
                return
            except Exception as e:
                print(f"[Firebase] Error parsing FIREBASE_SERVICE_ACCOUNT_JSON: {e}")

        # 2. Local fallback: read file directly from disk
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT", os.path.join(base_dir, "firebase-service-account.json"))
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred, {"storageBucket": FIREBASE_STORAGE_BUCKET})
            print(f"[Firebase] Initialized with service account: {cred_path}")
        else:
            firebase_admin.initialize_app(options={"storageBucket": FIREBASE_STORAGE_BUCKET})
            print("[Firebase] Initialized with default credentials")

def get_db():
    return firestore.client()

def get_auth():
    return auth

def get_storage():
    return storage.bucket()
