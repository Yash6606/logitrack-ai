import urllib.request, urllib.error

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/orders/',
    method='GET',
    headers={
        'Origin': 'http://localhost:3000',
        'Authorization': 'Bearer test'
    }
)

try:
    res = urllib.request.urlopen(req)
    print("Status: 200")
    for k, v in res.headers.items():
        print(f"  {k}: {v}")
except urllib.error.HTTPError as e:
    print(f"Status: {e.code}")
    for k, v in e.headers.items():
        print(f"  {k}: {v}")
