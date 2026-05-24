"""Automated pipeline script to retrain ML models from Firestore history."""
import sys
import os

# Append parent directories to path to ensure backend imports work smoothly
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import init_firebase
from ai.demand_forecast import train_demand_model
from ai.churn_predictor import train_churn_model

def run_retraining():
    print("=============================================")
    print("=== STARTING LOGITRACK ML RETRAINING PIPE ===")
    print("=============================================")
    
    # Initialize Firebase Admin SDK connection
    init_firebase()
    
    # Trigger training routines
    try:
        print("\n--- Training Demand Forecast Model (XGBoost) ---")
        train_demand_model()
    except Exception as e:
        print(f"Error training demand model: {e}")
        
    try:
        print("\n--- Training Customer Churn Model (Random Forest) ---")
        train_churn_model()
    except Exception as e:
        print(f"Error training churn model: {e}")
        
    print("\n=============================================")
    print("===  RETRAINING PIPELINE RUN COMPLETED    ===")
    print("=============================================")

if __name__ == "__main__":
    run_retraining()
