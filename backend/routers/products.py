from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from schemas.product import ProductCreate, ProductUpdate
from services.product_service import create_product, get_products, get_product, update_product, delete_product, get_low_stock, get_inventory_history
from utils.jwt_handler import verify_token
from config import get_storage
import uuid

router = APIRouter()

@router.get("/")
async def list_products():
    return get_products()

@router.get("/low-stock")
async def low_stock(threshold: int = 10, user=Depends(verify_token)):
    return get_low_stock(threshold)

@router.get("/{product_id}")
async def read_product(product_id: str):
    result = get_product(product_id)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.post("/")
async def add_product(data: ProductCreate, user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners can add products")
    return create_product(data.model_dump(), user["uid"])

@router.put("/{product_id}")
async def edit_product(product_id: str, data: ProductUpdate, user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners can edit products")
    result = update_product(product_id, data.model_dump(exclude_none=True))
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result

@router.delete("/{product_id}")
async def remove_product(product_id: str, user=Depends(verify_token)):
    if user.get("role") != "business_owner":
        raise HTTPException(status_code=403, detail="Only business owners can delete products")
    return delete_product(product_id)

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), user=Depends(verify_token)):
    try:
        bucket = get_storage()
        filename = f"products/{uuid.uuid4().hex}_{file.filename}"
        blob = bucket.blob(filename)
        content = await file.read()
        blob.upload_from_string(content, content_type=file.content_type)
        blob.make_public()
        return {"url": blob.public_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
