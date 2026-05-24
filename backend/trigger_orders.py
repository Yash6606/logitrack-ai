import urllib.request
import urllib.error
from jose import jwt
from datetime import datetime, timedelta, timezone

JWT_SECRET = "logitrack-ai-secret-key-2024"
JWT_ALGORITHM = "HS256"

# Create a mock customer token
expire = datetime.now(timezone.utc) + timedelta(hours=24)
token = jwt.encode(
    {"uid": "test_customer", "role": "customer", "exp": expire},
    JWT_SECRET,
    algorithm=JWT_ALGORITHM
)

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/orders/',
    method='GET',
    headers={
        'Origin': 'http://localhost:3000',
        'Authorization': f'Bearer {token}'
    }
)

try:
    res = urllib.request.urlopen(req)
    print("Status: 200")
    print(res.read().decode())
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    print(e.read().decode())
