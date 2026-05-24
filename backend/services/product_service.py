from config import get_db
from utils.helpers import generate_id, now_iso

def create_product(data: dict, business_id: str) -> dict:
    db = get_db()
    product_id = generate_id()
    product = {
        "id": product_id,
        "name": data["name"],
        "description": data.get("description", ""),
        "price": data["price"],
        "stock": data["stock"],
        "sku": data["sku"],
        "category": data["category"],
        "image_url": data.get("image_url", ""),
        "business_id": business_id,
        "created_at": now_iso()
    }
    db.collection("products").document(product_id).set(product)
    # Log inventory
    db.collection("inventory_history").add({
        "product_id": product_id,
        "action": "created",
        "quantity": data["stock"],
        "timestamp": now_iso()
    })
    return product

def get_products() -> list:
    db = get_db()
    return [doc.to_dict() for doc in db.collection("products").stream()]

def get_product(product_id: str) -> dict:
    db = get_db()
    doc = db.collection("products").document(product_id).get()
    return doc.to_dict() if doc.exists else {"error": "Not found"}

def update_product(product_id: str, data: dict) -> dict:
    db = get_db()
    update_data = {k: v for k, v in data.items() if v is not None}
    old_doc = db.collection("products").document(product_id).get()
    if not old_doc.exists:
        return {"error": "Not found"}
    old_data = old_doc.to_dict()
    if "stock" in update_data and update_data["stock"] != old_data.get("stock"):
        diff = update_data["stock"] - old_data.get("stock", 0)
        db.collection("inventory_history").add({
            "product_id": product_id,
            "action": "restocked" if diff > 0 else "adjusted",
            "quantity": diff,
            "timestamp": now_iso()
        })
    db.collection("products").document(product_id).update(update_data)
    return db.collection("products").document(product_id).get().to_dict()

def delete_product(product_id: str) -> dict:
    db = get_db()
    db.collection("products").document(product_id).delete()
    return {"message": "Product deleted"}

def get_low_stock(threshold: int = 10) -> list:
    db = get_db()
    products = db.collection("products").where("stock", "<=", threshold).stream()
    return [doc.to_dict() for doc in products]

def get_inventory_history(product_id: str = None) -> list:
    db = get_db()
    query = db.collection("inventory_history")
    if product_id:
        query = query.where("product_id", "==", product_id)
    docs = query.stream()
    history = [doc.to_dict() for doc in docs]
    history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    return history[:50]
