import socketio
from typing import Dict, Set

connected_clients: Dict[str, Set[str]] = {}

def setup_socket_events(sio: socketio.AsyncServer):

    @sio.event
    async def connect(sid, environ):
        print(f"[WS] Client connected: {sid}")

    @sio.event
    async def disconnect(sid):
        for room in list(connected_clients.keys()):
            connected_clients[room].discard(sid)
        print(f"[WS] Client disconnected: {sid}")

    @sio.event
    async def join_room(sid, data):
        room = data.get("room", "")
        if room:
            await sio.enter_room(sid, room)
            connected_clients.setdefault(room, set()).add(sid)
            print(f"[WS] {sid} joined room: {room}")

    @sio.event
    async def leave_room(sid, data):
        room = data.get("room", "")
        if room:
            await sio.leave_room(sid, room)
            if room in connected_clients:
                connected_clients[room].discard(sid)

    @sio.event
    async def location_update(sid, data):
        delivery_id = data.get("deliveryId")
        await sio.emit("delivery_location", {
            "deliveryId": delivery_id,
            "lat": data.get("lat"),
            "lng": data.get("lng"),
            "agentId": data.get("agentId"),
            "timestamp": data.get("timestamp")
        }, room=f"delivery:{delivery_id}")
        await sio.emit("agent_location", {
            "agentId": data.get("agentId"),
            "deliveryId": delivery_id,
            "lat": data.get("lat"),
            "lng": data.get("lng")
        }, room="dashboard")

    @sio.event
    async def order_status_change(sid, data):
        order_id = data.get("orderId")
        customer_id = data.get("customerId")
        await sio.emit("order_update", {
            "orderId": order_id,
            "status": data.get("status")
        }, room=f"user:{customer_id}")
        await sio.emit("order_update", {
            "orderId": order_id,
            "status": data.get("status")
        }, room=f"delivery:{order_id}")
        await sio.emit("dashboard_update", {
            "type": "order_status",
            "orderId": order_id,
            "status": data.get("status")
        }, room="dashboard")

    @sio.event
    async def send_notification(sid, data):
        user_id = data.get("userId")
        await sio.emit("notification", {
            "message": data.get("message"),
            "type": data.get("type", "info"),
            "timestamp": data.get("timestamp")
        }, room=f"user:{user_id}")

    return sio
