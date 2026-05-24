"""Smart Auto-Assign - Find best delivery agent based on predicted ETA and availability using SciPy bipartite matching optimization."""
from config import get_db
from utils.helpers import haversine
import numpy as np
from scipy.optimize import linear_sum_assignment

def predict_delivery_eta(pickup_location: dict, agent_location: dict, workload: int) -> float:
    """
    Predict transit time in minutes using distance and workload backlog queue.
    In a high-fidelity environment, this acts as a surrogate for a trained gradient booster.
    """
    distance = haversine(
        pickup_location.get("lat", 0), pickup_location.get("lng", 0),
        agent_location.get("lat", 0), agent_location.get("lng", 0)
    )
    
    # Average speed: 25 km/h transit speed in standard traffic
    # 25 km/h = 0.416 km per minute. Thus, transit time = distance / 0.416
    transit_minutes = distance / 0.416 if distance > 0 else 0.0
    
    # Workload queue delay: 8 minutes estimated service time per pending delivery
    queue_minutes = workload * 8.0
    
    # Total ETA prediction
    return transit_minutes + queue_minutes

def auto_assign_agent(pickup_location: dict) -> dict:
    """
    Score agents by:
    - Predicted ETA to delivery completion (lower is better, higher normalized score)
    - Availability
    """
    db = get_db()
    agents = db.collection("users").where("role", "==", "delivery_agent").stream()

    scored_agents = []
    for agent in agents:
        data = agent.to_dict()
        agent_id = data.get("uid", agent.id)
        location = data.get("location", {})

        if not location.get("lat") or not location.get("lng"):
            continue

        is_available = data.get("is_available", True)
        workload = data.get("current_workload", 0)

        # Distance calculation
        distance = haversine(
            pickup_location.get("lat", 0), pickup_location.get("lng", 0),
            location["lat"], location["lng"]
        )

        # Predicted ETA
        predicted_eta = predict_delivery_eta(pickup_location, location, workload)
        
        # Availability multiplier
        avail_mult = 1.0 if is_available else 0.15
        
        # Calculate a normalized score: lower ETA -> higher score
        # Cap max ETA at 60 mins for scoring bounds
        max_eta = 60.0
        eta_score = max(0.01, 1 - (predicted_eta / max_eta))
        total_score = eta_score * avail_mult

        scored_agents.append({
            "agent_id": agent_id,
            "name": data.get("name", ""),
            "phone": data.get("phone", ""),
            "distance_km": round(distance, 2),
            "workload": workload,
            "is_available": is_available,
            "score": round(total_score, 3),
            "predicted_eta_mins": round(predicted_eta, 1),
            "location": location
        })

    scored_agents.sort(key=lambda x: x["score"], reverse=True)

    if not scored_agents:
        return {"error": "No delivery agents available"}

    return {
        "assigned_agent": scored_agents[0],
        "all_candidates": scored_agents[:5]
    }

def solve_global_fleet_assignment(pickup_locations: list) -> dict:
    """
    Globally optimize matching for a batch of pending pickups against all active agents.
    Uses SciPy's Hungarian algorithm to minimize total fleet ETA.
    
    pickup_locations: List of dicts [{"order_id": str, "lat": float, "lng": float}]
    """
    db = get_db()
    agents_ref = db.collection("users").where("role", "==", "delivery_agent").stream()
    
    agents = []
    for agent in agents_ref:
        data = agent.to_dict()
        loc = data.get("location", {})
        if loc.get("lat") and loc.get("lng") and data.get("is_available", True):
            agents.append({
                "agent_id": data.get("uid", agent.id),
                "name": data.get("name", "Unknown"),
                "location": loc,
                "workload": data.get("current_workload", 0)
            })
            
    if not agents or not pickup_locations:
        return {"error": "No available agents or no pending pickups to match"}
        
    num_pickups = len(pickup_locations)
    num_agents = len(agents)
    
    # Create Cost Matrix: row=pickups, col=agents
    cost_matrix = np.zeros((num_pickups, num_agents))
    
    for i, pickup in enumerate(pickup_locations):
        for j, agent in enumerate(agents):
            cost_matrix[i, j] = predict_delivery_eta(pickup, agent["location"], agent["workload"])
            
    # Apply global Hungarian matching solver
    row_ind, col_ind = linear_sum_assignment(cost_matrix)
    
    assignments = []
    for r, c in zip(row_ind, col_ind):
        assignments.append({
            "order_id": pickup_locations[r]["order_id"],
            "assigned_agent": {
                "agent_id": agents[c]["agent_id"],
                "name": agents[c]["name"],
                "predicted_eta_mins": round(cost_matrix[r, c], 1)
            }
        })
        
    return {
        "assignments": assignments,
        "unassigned_orders_count": max(0, num_pickups - len(assignments))
    }
