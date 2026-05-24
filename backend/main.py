from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from contextlib import asynccontextmanager
from config import init_firebase
from routers import auth, products, inventory, orders, delivery, analytics, ai, billing, payouts
from websocket.manager import setup_socket_events

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*", logger=False)

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    yield

app = FastAPI(title="LogiTrack AI API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+):\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(products.router, prefix="/api/products", tags=["Products"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(delivery.router, prefix="/api/delivery", tags=["Delivery"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(ai.router, prefix="/api/ai", tags=["AI"])
app.include_router(billing.router, prefix="/api/billing", tags=["Billing"])
app.include_router(payouts.router, prefix="/api/payouts", tags=["Payouts"])

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "LogiTrack AI API"}

setup_socket_events(sio)

combined_app = socketio.ASGIApp(sio, app)
