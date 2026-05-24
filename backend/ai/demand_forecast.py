"""Demand Forecasting - Predict product restock needs using rule-based heuristics or trained XGBoost models."""
import os
import joblib
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, timezone
from config import get_db

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "demand_forecast_xgb.joblib")

def _forecast_demand_rules(db, products, thirty_days_ago):
    """Fallback logic using original rule-based Weighted Moving Average (WMA)."""
    orders = db.collection("orders").where("created_at", ">=", thirty_days_ago).stream()

    product_sales = {}
    for order in orders:
        data = order.to_dict()
        for item in data.get("items", []):
            pid = item.get("product_id")
            qty = item.get("quantity", 1)
            product_sales.setdefault(pid, {"name": item.get("product_name", ""), "daily": {}, "total": 0})
            day = data.get("created_at", "")[:10]
            product_sales[pid]["daily"].setdefault(day, 0)
            product_sales[pid]["daily"][day] += qty
            product_sales[pid]["total"] += qty

    forecasts = []
    for pid, sales in product_sales.items():
        days_with_sales = len(sales["daily"])
        if days_with_sales == 0:
            continue

        daily_avg = sales["total"] / max(days_with_sales, 1)

        # Weighted moving average: recent days weighted more
        sorted_days = sorted(sales["daily"].keys())
        if len(sorted_days) >= 3:
            recent = sum(sales["daily"][d] for d in sorted_days[-7:]) / min(7, len(sorted_days))
            older = sum(sales["daily"][d] for d in sorted_days[:-7]) / max(len(sorted_days) - 7, 1) if len(sorted_days) > 7 else daily_avg
            trend = "increasing" if recent > older * 1.1 else ("decreasing" if recent < older * 0.9 else "stable")
            predicted_7day = round(recent * 7 * 1.1 if trend == "increasing" else recent * 7)
        else:
            trend = "stable"
            predicted_7day = round(daily_avg * 7)

        current_stock = products.get(pid, {}).get("stock", 0)
        restock_needed = predicted_7day > current_stock
        urgency = "critical" if current_stock <= predicted_7day * 0.3 else ("high" if current_stock <= predicted_7day * 0.6 else ("medium" if restock_needed else "low"))

        forecasts.append({
            "product_id": pid,
            "product_name": sales["name"] or products.get(pid, {}).get("name", "Unknown"),
            "current_stock": current_stock,
            "daily_average": round(daily_avg, 1),
            "predicted_7day_demand": predicted_7day,
            "trend": trend,
            "restock_recommended": restock_needed,
            "urgency": urgency,
            "suggested_restock_qty": max(0, predicted_7day - current_stock + 10) if restock_needed else 0
        })
    return forecasts

def fetch_historical_sales_df() -> pd.DataFrame:
    """Fetch all orders to construct a daily product sales timeseries."""
    db = get_db()
    orders_ref = db.collection("orders").stream()
    
    records = []
    for order in orders_ref:
        data = order.to_dict()
        created_at = data.get("created_at", "")
        if not created_at:
            continue
        try:
            # Convert timestamp to date
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date()
            for item in data.get("items", []):
                records.append({
                    "date": dt,
                    "product_id": item.get("product_id"),
                    "quantity": item.get("quantity", 1)
                })
        except Exception:
            continue
            
    if not records:
        return pd.DataFrame(columns=["date", "product_id", "quantity"])
        
    df = pd.DataFrame(records)
    # Aggregate daily quantities per product
    df_daily = df.groupby(["date", "product_id"])["quantity"].sum().reset_index()
    return df_daily

def prepare_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineer lag and rolling statistics for time-series forecasting."""
    if df.empty or len(df) < 5:
        return pd.DataFrame()
        
    # Ensure full date range for each product to prevent gaps
    df["date"] = pd.to_datetime(df["date"])
    products = df["product_id"].unique()
    dates = pd.date_range(start=df["date"].min(), end=df["date"].max())
    
    idx = pd.MultiIndex.from_product([dates, products], names=["date", "product_id"])
    df = df.set_index(["date", "product_id"]).reindex(idx, fill_value=0).reset_index()
    
    # Sort for rolling computations
    df = df.sort_values(by=["product_id", "date"]).reset_index(drop=True)
    
    # Lag Features
    for lag in [1, 2, 7, 14]:
        df[f"lag_{lag}"] = df.groupby("product_id")["quantity"].shift(lag)
        
    # Rolling Statistics
    df["rolling_mean_7"] = df.groupby("product_id")["quantity"].transform(lambda x: x.shift(1).rolling(7, min_periods=1).mean())
    df["rolling_std_7"] = df.groupby("product_id")["quantity"].transform(lambda x: x.shift(1).rolling(7, min_periods=1).std().fillna(0))
    df["rolling_mean_14"] = df.groupby("product_id")["quantity"].transform(lambda x: x.shift(1).rolling(14, min_periods=1).mean())
    
    # Time Features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    
    # Fill remaining NaNs with 0 to prevent issues
    df = df.fillna(0).reset_index(drop=True)
    return df

def train_demand_model():
    """Train XGBoost model on historical timeseries data and output accuracy statistics."""
    from xgboost import XGBRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, r2_score
    
    df = fetch_historical_sales_df()
    if df.empty or len(df) < 15:
        print("[Demand ML] Not enough historical data to train forecasting model (needs at least 15 sales points).")
        return
        
    df_features = prepare_lag_features(df)
    if df_features.empty:
        print("[Demand ML] Feature dataframe is empty.")
        return
        
    feature_cols = [
        "lag_1", "lag_2", "lag_7", "lag_14", 
        "rolling_mean_7", "rolling_std_7", "rolling_mean_14", 
        "day_of_week", "month"
    ]
    
    X = df_features[feature_cols]
    y = df_features["quantity"]
    
    # Split into train & validation sets to compute metrics
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train validation model
    val_model = XGBRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    val_model.fit(X_train, y_train)
    
    # Predict and evaluate
    y_pred = val_model.predict(X_val)
    mae = mean_absolute_error(y_val, y_pred)
    r2 = r2_score(y_val, y_pred)
    
    print("\n----------------------------------------------")
    print("=== XGBOOST DEMAND FORECAST METRICS ===")
    print(f" > Validation Mean Absolute Error (MAE): {mae:.3f} units")
    print(f" > Validation R-squared (R2) Score: {r2:.3f}")
    print("----------------------------------------------")
    
    # Train final model on full dataset
    model = XGBRegressor(n_estimators=100, learning_rate=0.08, max_depth=4, random_state=42)
    model.fit(X, y)
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[Demand ML] Final model saved successfully at {MODEL_PATH}")


def forecast_demand():
    """Analyze last 30 days orders, predict next 7 days demand using rule-based WMA or ML."""
    db = get_db()
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    
    # Always fetch products first
    products = {doc.id: doc.to_dict() for doc in db.collection("products").stream()}
    
    # Fallback checks: If model doesn't exist, use rule-based heuristics
    if not os.path.exists(MODEL_PATH):
        print("[Demand Forecasting] ML Model not found. Falling back to rule-based WMA.")
        res = _forecast_demand_rules(db, products, thirty_days_ago)
        # Ensure we always return something for all products, even if they have 0 sales
        registered_pids = set(products.keys())
        forecast_pids = {r["product_id"] for r in res}
        missing_pids = registered_pids - forecast_pids
        for pid in missing_pids:
            res.append({
                "product_id": pid,
                "product_name": products[pid].get("name", "Unknown"),
                "current_stock": products[pid].get("stock", 0),
                "daily_average": 0.0,
                "predicted_7day_demand": 0,
                "trend": "stable",
                "restock_recommended": False,
                "urgency": "low",
                "suggested_restock_qty": 0
            })
        res.sort(key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x["urgency"], 3))
        return res
        
    try:
        model = joblib.load(MODEL_PATH)
        df = fetch_historical_sales_df()
        df_features = prepare_lag_features(df)
        
        forecasts = []
        
        for pid, prod_data in products.items():
            current_stock = prod_data.get("stock", 0)
            
            # Sub-dataframe for this product
            prod_history = df_features[df_features["product_id"] == pid] if not df_features.empty else pd.DataFrame()
            
            if prod_history.empty:
                # Baseline guess if product has zero sale history in dataset
                predicted_7day = 2
                trend = "stable"
                daily_avg = 0.0
            else:
                # Get the last row of features as a starting point
                latest_row = prod_history.iloc[-1].copy()
                
                # Autoregressive prediction simulation for next 7 days
                predictions = []
                current_lags = [
                    float(latest_row["quantity"]),
                    float(latest_row["lag_1"]),
                    float(latest_row["lag_6"]) if "lag_6" in latest_row else 0.0,
                    float(latest_row["lag_13"]) if "lag_13" in latest_row else 0.0
                ]
                
                now = datetime.now()
                for d in range(7):
                    pred_input = np.array([[
                        current_lags[0],
                        current_lags[1],
                        float(latest_row["lag_7"]),
                        float(latest_row["lag_14"]),
                        float(latest_row["rolling_mean_7"]),
                        float(latest_row["rolling_std_7"]),
                        float(latest_row["rolling_mean_14"]),
                        (now.weekday() + d) % 7,
                        now.month
                    ]])
                    pred_qty = max(0.0, float(model.predict(pred_input)[0]))
                    predictions.append(pred_qty)
                    
                    # Update simulated lag registers
                    current_lags = [pred_qty] + current_lags[:-1]
                    
                predicted_7day = int(round(sum(predictions)))
                daily_avg = float(prod_history["quantity"].mean())
                
                recent_avg = np.mean(predictions)
                historical_avg = prod_history["quantity"].tail(14).mean()
                trend = "increasing" if recent_avg > historical_avg * 1.1 else ("decreasing" if recent_avg < historical_avg * 0.9 else "stable")
                
            restock_needed = predicted_7day > current_stock
            urgency = "critical" if current_stock <= predicted_7day * 0.3 else ("high" if current_stock <= predicted_7day * 0.6 else ("medium" if restock_needed else "low"))
            
            forecasts.append({
                "product_id": pid,
                "product_name": prod_data.get("name", "Unknown"),
                "current_stock": current_stock,
                "daily_average": round(daily_avg, 1),
                "predicted_7day_demand": predicted_7day,
                "trend": trend,
                "restock_recommended": restock_needed,
                "urgency": urgency,
                "suggested_restock_qty": max(0, predicted_7day - current_stock + 10) if restock_needed else 0
            })
            
        forecasts.sort(key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x["urgency"], 3))
        return forecasts
        
    except Exception as e:
        print(f"[Demand Forecasting ML Error] {e}. Falling back to rule-based WMA.")
        res = _forecast_demand_rules(db, products, thirty_days_ago)
        res.sort(key=lambda x: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(x["urgency"], 3))
        return res
