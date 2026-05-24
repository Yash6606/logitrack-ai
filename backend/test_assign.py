from utils.jwt_handler import create_token
from config import init_firebase, get_db
import urllib.request
import urllib.error
import json

init_firebase()
db = get_db()

# Get an order id that has status 'placed' or 'confirmed'
orders = list(db.collection("orders").where("status", "==", "placed").stream())
if not orders:
    orders = list(db.collection("orders").stream())

if not orders:
    print("No orders found!")
    exit(0)

order_id = orders[0].id
print(f"Testing with Order ID: {order_id}")

# Get a delivery agent
agents = list(db.collection("users").where("role", "==", "delivery_agent").stream())
if not agents:
    print("No delivery agents found!")
    exit(0)

agent_id = agents[0].id
print(f"Testing with Agent ID: {agent_id}")

# 1. Generate token for a business_owner
token_owner = create_token({"uid": "owner_uid", "email": "owner@logitrack.ai", "role": "business_owner"})

# 2. Make assign request
req = urllib.request.Request(
    f'http://127.0.0.1:8000/api/orders/{order_id}/assign',
    method='PUT',
    headers={
        'Origin': 'http://localhost:3000',
        'Authorization': f'Bearer {token_owner}',
        'Content-Type': 'application/json'
    },
    data=json.dumps({"agent_id": agent_id}).encode('utf-8')
)

try:
    res = urllib.request.urlopen(req)
    print("Owner assign status: 200 OK")
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print(f"Owner assign status failed: {e.code}")
    print(e.read().decode())

# 3. Generate token for a customer to verify 403 Forbidden works correctly
token_cust = create_token({"uid": "cust_uid", "email": "customer@logitrack.ai", "role": "customer"})
req = urllib.request.Request(
    f'http://127.0.0.1:8000/api/orders/{order_id}/assign',
    method='PUT',
    headers={
        'Origin': 'http://localhost:3000',
        'Authorization': f'Bearer {token_cust}',
        'Content-Type': 'application/json'
    },
    data=json.dumps({"agent_id": agent_id}).encode('utf-8')
)

try:
    res = urllib.request.urlopen(req)
    print("Customer assign status: 200 OK (Unexpected!)")
except urllib.error.HTTPError as e:
    print(f"Customer assign status failed (expected): {e.code}")
    print(e.read().decode())
