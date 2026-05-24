"""Customer Churn Predictor - Identify customers at risk of churning using rule-based heuristics or Random Forest classification."""
import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from config import get_db

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "churn_rf.joblib")

def _predict_churn_rules(db, customers, now):
    """Fallback logic using the original rule-based days since last order heuristic."""
    churn_results = []

    # Optimize Firestore read limits: pre-fetch all orders in a single query & group in-memory
    orders_by_customer = {}
    try:
        orders_stream = db.collection("orders").stream()
        for doc in orders_stream:
            order_data = doc.to_dict()
            cust_id = order_data.get("customer_id")
            if cust_id:
                orders_by_customer.setdefault(cust_id, []).append(order_data)
    except Exception as e:
        print(f"[Churn Heuristics] Error pre-fetching orders: {e}")

    for customer in customers:
        data = customer.to_dict()
        customer_id = customer.id

        # Get customer's orders from the pre-fetched in-memory dictionary
        orders = orders_by_customer.get(customer_id, [])

        last_order = None
        if orders:
            orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            last_order = orders[0]

        if last_order:
            last_order_date = last_order.get("created_at", "")
            try:
                last_dt = datetime.fromisoformat(last_order_date.replace("Z", "+00:00"))
                days_since = (now - last_dt).days
            except (ValueError, AttributeError):
                days_since = 999
        else:
            created = data.get("created_at", "")
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                days_since = (now - created_dt).days
            except (ValueError, AttributeError):
                days_since = 999

        if days_since >= 30:
            risk_level = "high"
            suggestion = "Send personalized discount offer or re-engagement email"
        elif days_since >= 15:
            risk_level = "medium"
            suggestion = "Send product recommendations based on past purchases"
        else:
            risk_level = "low"
            suggestion = "Customer is active, maintain engagement"

        # Count total orders
        total_orders = len(orders)

        churn_results.append({
            "customer_id": customer_id,
            "name": data.get("name", "Unknown"),
            "email": data.get("email", ""),
            "days_since_last_order": days_since,
            "total_orders": total_orders,
            "risk_level": risk_level,
            "suggestion": suggestion,
            "re_engagement_suggested": risk_level in ["high", "medium"]
        })
    return churn_results

def extract_churn_dataset() -> pd.DataFrame:
    """Build a rich RFM and engagement dataset from Firestore for model training."""
    db = get_db()
    customers_ref = db.collection("users").where("role", "==", "customer").stream()
    now = datetime.now(timezone.utc)
    
    # Optimize Firestore read limits: pre-fetch all orders in a single query & group in-memory
    orders_by_customer = {}
    try:
        orders_stream = db.collection("orders").stream()
        for doc in orders_stream:
            order_data = doc.to_dict()
            cust_id = order_data.get("customer_id")
            if cust_id:
                orders_by_customer.setdefault(cust_id, []).append(order_data)
    except Exception as e:
        print(f"[Churn ML] Error pre-fetching orders for training dataset: {e}")
        
    dataset = []
    
    for customer in customers_ref:
        c_data = customer.to_dict()
        cid = customer.id
        
        # Get customer orders from pre-fetched dictionary
        orders = orders_by_customer.get(cid, [])
        
        total_orders = len(orders)
        
        if total_orders == 0:
            # No orders yet - check account age
            created_at = c_data.get("created_at", "")
            try:
                created_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                recency_days = (now - created_dt).days
            except Exception:
                recency_days = 999
            ltv = 0.0
            avg_order_value = 0.0
            return_rate = 0.0
            avg_rating = 5.0
        else:
            orders.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            last_order = orders[0]
            last_order_date = last_order.get("created_at", "")
            
            try:
                last_dt = datetime.fromisoformat(last_order_date.replace("Z", "+00:00"))
                recency_days = (now - last_dt).days
            except Exception:
                recency_days = 999
                
            ltv = sum(o.get("total_amount", 0.0) for o in orders)
            avg_order_value = ltv / total_orders
            
            returned_orders = sum(1 for o in orders if o.get("status") == "returned")
            return_rate = returned_orders / total_orders
            
            avg_rating = 4.2  # default baseline
            
        # Target variable (Historical Churn ground truth label):
        # 1 if inactive for more than 30 days, else 0
        is_churned = 1 if recency_days >= 30 else 0
        
        dataset.append({
            "customer_id": cid,
            "email": c_data.get("email", ""),
            "name": c_data.get("name", "Unknown"),
            "recency": recency_days,
            "frequency": total_orders,
            "monetary": ltv,
            "avg_order_value": avg_order_value,
            "return_rate": return_rate,
            "avg_rating": avg_rating,
            "label": is_churned
        })
        
    return pd.DataFrame(dataset)

def train_churn_model():
    """Train a Random Forest Classifier on engineered customer metrics and output validation accuracy."""
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import accuracy_score, f1_score
    
    df = extract_churn_dataset()
    if df.empty or len(df) < 5:
        print("[Churn ML] Not enough customer profiles to train ML model (needs at least 5 customers).")
        return
        
    feature_cols = ["frequency", "monetary", "avg_order_value", "return_rate", "avg_rating"]
    X = df[feature_cols]
    y = df["label"]
    
    # Since we need at least a few instances to split, run split if dataset is reasonably large
    if len(df) >= 10:
        X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
        val_model = RandomForestClassifier(n_estimators=60, max_depth=4, random_state=42)
        val_model.fit(X_train, y_train)
        y_pred = val_model.predict(X_val)
        acc = accuracy_score(y_val, y_pred)
        f1 = f1_score(y_val, y_pred, zero_division=0)
        
        print("\n----------------------------------------------")
        print("=== RANDOM FOREST CUSTOMER CHURN METRICS ===")
        print(f" > Validation Accuracy Score: {acc * 100:.1f}%")
        print(f" > Validation F1-Score: {f1:.3f}")
        print("----------------------------------------------")
    else:
        # Too small to split, just evaluate on training set for logs
        val_model = RandomForestClassifier(n_estimators=60, max_depth=4, random_state=42)
        val_model.fit(X, y)
        y_pred = val_model.predict(X)
        acc = accuracy_score(y, y_pred)
        print("\n----------------------------------------------")
        print("=== RANDOM FOREST CUSTOMER CHURN METRICS (Small Dataset) ===")
        print(f" > Training Accuracy Score: {acc * 100:.1f}%")
        print("----------------------------------------------")
        
    # Train final model on full dataset
    model = RandomForestClassifier(n_estimators=60, max_depth=4, random_state=42)
    model.fit(X, y)
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[Churn ML] Final model saved successfully at {MODEL_PATH}")


def predict_churn():
    """Classify customers by churn risk using rules or modern machine learning."""
    db = get_db()
    now = datetime.now(timezone.utc)
    
    # Fallback to rules if model file doesn't exist
    if not os.path.exists(MODEL_PATH):
        print("[Churn Prediction] ML Model not found. Falling back to rule-based heuristics.")
        customers = db.collection("users").where("role", "==", "customer").stream()
        res = _predict_churn_rules(db, customers, now)
        res.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}[x["risk_level"]])
        return res
        
    try:
        model = joblib.load(MODEL_PATH)
        df = extract_churn_dataset()
        if df.empty:
            return []
            
        feature_cols = ["frequency", "monetary", "avg_order_value", "return_rate", "avg_rating"]
        
        # Predict probabilities
        probabilities = model.predict_proba(df[feature_cols])[:, 1]
        df["churn_probability"] = probabilities
        
        churn_results = []
        for idx, row in df.iterrows():
            prob = row["churn_probability"]
            recency = row["recency"]
            
            # Combine model probability with absolute safety thresholds
            if prob >= 0.7 or recency >= 45:
                risk_level = "high"
                suggestion = "Critical risk! Send 20% discount coupon or ₹100 direct wallet credit."
            elif prob >= 0.35 or recency >= 20:
                risk_level = "medium"
                suggestion = "Send personalized product recommendations + 10% coupon."
            else:
                risk_level = "low"
                suggestion = "Customer is active. Maintain engagement and send loyalty updates."
                
            churn_results.append({
                "customer_id": row["customer_id"],
                "name": row["name"],
                "email": row["email"],
                "days_since_last_order": int(recency),
                "total_orders": int(row["frequency"]),
                "risk_level": risk_level,
                "suggestion": suggestion,
                "re_engagement_suggested": risk_level in ["high", "medium"]
            })
            
        churn_results.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}[x["risk_level"]])
        return churn_results
        
    except Exception as e:
        print(f"[Churn Prediction ML Error] {e}. Falling back to rule-based heuristics.")
        customers = db.collection("users").where("role", "==", "customer").stream()
        res = _predict_churn_rules(db, customers, now)
        res.sort(key=lambda x: {"high": 0, "medium": 1, "low": 2}[x["risk_level"]])
        return res
