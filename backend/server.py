"""
KedaiOps - Coffee Shop POS & Stock Management API
Phase 4: Security Hardening + Pagination + Backup/Restore
"""
import os
import io
import csv
import jwt
import json
import bcrypt
import secrets
from datetime import datetime, timedelta
from typing import Optional
from contextlib import asynccontextmanager
from collections import defaultdict
import time

from fastapi import FastAPI, HTTPException, Depends, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from bson import ObjectId

from pydantic import BaseModel
from typing import List, Any

from models import (
    serialize_doc,
    IngredientCreate, IngredientUpdate, StockAdjustment,
    MenuCreate, MenuUpdate,
    SaleCreate, SyncBatchRequest,
    UserCreate, UserLogin, UserUpdate,
    StoreSettings
)

# Restore request models
class RestoreIngredientsRequest(BaseModel):
    ingredients: List[dict]

class RestoreMenusRequest(BaseModel):
    menus: List[dict]

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "kedaiops")

# Security: Use env variable or generate secure secret
JWT_SECRET = os.getenv("JWT_SECRET")
if not JWT_SECRET or len(JWT_SECRET) < 32:
    # Generate a secure secret if not provided or too short
    JWT_SECRET = secrets.token_hex(32)
    print(f"WARNING: Using auto-generated JWT_SECRET. Set JWT_SECRET env variable for production.")

JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

# Rate limiting for login (simple in-memory)
login_attempts = defaultdict(list)
MAX_LOGIN_ATTEMPTS = 5
LOGIN_WINDOW_SECONDS = 300  # 5 minutes

# Database connection
db_client: Optional[AsyncIOMotorClient] = None
db = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client, db
    db_client = AsyncIOMotorClient(MONGO_URL)
    db = db_client[DB_NAME]
    
    # Create indexes
    await db.ingredients.create_index("name")
    await db.menus.create_index("name")
    await db.menus.create_index("category")
    await db.sales.create_index("client_id", unique=True)
    await db.sales.create_index("created_at")
    await db.stock_ledger.create_index([("sale_id", 1), ("ingredient_id", 1)], unique=True)
    await db.users.create_index("email", unique=True)
    
    # Create default owner if no users exist
    user_count = await db.users.count_documents({})
    if user_count == 0:
        hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt())
        await db.users.insert_one({
            "email": "admin@kedaiops.com",
            "password": hashed.decode(),
            "name": "Admin",
            "role": "owner",
            "is_active": True,
            "created_at": datetime.utcnow()
        })
    
    yield
    
    db_client.close()


app = FastAPI(title="KedaiOps API", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# ============ AUTH HELPERS ============
def check_rate_limit(identifier: str) -> bool:
    """Check if login attempts exceed rate limit"""
    now = time.time()
    # Clean old attempts
    login_attempts[identifier] = [t for t in login_attempts[identifier] if now - t < LOGIN_WINDOW_SECONDS]
    return len(login_attempts[identifier]) < MAX_LOGIN_ATTEMPTS


def record_login_attempt(identifier: str):
    """Record a login attempt"""
    login_attempts[identifier].append(time.time())


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user or not user.get("is_active", True):
        raise HTTPException(401, "User not found or inactive")
    return serialize_doc(user)


async def get_optional_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Optional auth - returns None if not authenticated"""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        return serialize_doc(user) if user else None
    except Exception:
        return None


def require_role(*roles):
    async def role_checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"Role '{user['role']}' tidak diizinkan")
        return user
    return role_checker


# ============ HEALTH CHECK ============
@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "KedaiOps API"}


# ============ AUTH ENDPOINTS ============
@app.post("/api/auth/login")
async def login(data: UserLogin, request: Request):
    # Rate limiting
    client_ip = request.client.host if request.client else "unknown"
    identifier = f"{client_ip}:{data.email}"
    
    if not check_rate_limit(identifier):
        raise HTTPException(429, "Terlalu banyak percobaan login. Coba lagi dalam 5 menit.")
    
    user = await db.users.find_one({"email": data.email})
    if not user:
        record_login_attempt(identifier)
        raise HTTPException(401, "Email atau password salah")
    
    if not bcrypt.checkpw(data.password.encode(), user["password"].encode()):
        record_login_attempt(identifier)
        raise HTTPException(401, "Email atau password salah")
    
    if not user.get("is_active", True):
        raise HTTPException(401, "Akun tidak aktif")
    
    token = create_token(str(user["_id"]), user["email"], user["role"])
    return {
        "token": token,
        "user": serialize_doc({
            "_id": user["_id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        })
    }


@app.get("/api/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}


@app.post("/api/auth/register")
async def register(data: UserCreate, current_user: dict = Depends(require_role("owner"))):
    """Only owner can create new users"""
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(400, "Email sudah terdaftar")
    
    hashed = bcrypt.hashpw(data.password.encode(), bcrypt.gensalt())
    user = {
        "email": data.email,
        "password": hashed.decode(),
        "name": data.name,
        "role": data.role,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    return {"user": serialize_doc(user)}


@app.get("/api/users")
async def list_users(current_user: dict = Depends(require_role("owner", "manager"))):
    users = await db.users.find({}, {"password": 0}).to_list(100)
    return {"users": serialize_doc(users)}


@app.put("/api/users/{user_id}")
async def update_user(user_id: str, data: UserUpdate, current_user: dict = Depends(require_role("owner"))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No data to update")
    
    result = await db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "User tidak ditemukan")
    
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    return {"user": serialize_doc(user)}


# ============ INGREDIENTS ENDPOINTS ============
@app.get("/api/ingredients")
async def list_ingredients(low_stock_only: bool = False):
    query = {}
    if low_stock_only:
        query["$expr"] = {"$lte": ["$stock_qty", "$low_stock_threshold"]}
    
    ingredients = await db.ingredients.find(query).sort("name", 1).to_list(500)
    return {"ingredients": serialize_doc(ingredients)}


@app.post("/api/ingredients")
async def create_ingredient(data: IngredientCreate, user: dict = Depends(require_role("owner", "manager"))):
    ingredient = {
        **data.model_dump(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.ingredients.insert_one(ingredient)
    ingredient["_id"] = result.inserted_id
    return {"ingredient": serialize_doc(ingredient)}


@app.put("/api/ingredients/{ingredient_id}")
async def update_ingredient(ingredient_id: str, data: IngredientUpdate, user: dict = Depends(require_role("owner", "manager"))):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(400, "No data to update")
    
    update_data["updated_at"] = datetime.utcnow()
    result = await db.ingredients.update_one({"_id": ObjectId(ingredient_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Bahan tidak ditemukan")
    
    ingredient = await db.ingredients.find_one({"_id": ObjectId(ingredient_id)})
    return {"ingredient": serialize_doc(ingredient)}


@app.delete("/api/ingredients/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, user: dict = Depends(require_role("owner"))):
    # Check if used in any menu
    menu_using = await db.menus.find_one({"recipe.ingredient_id": ingredient_id})
    if menu_using:
        raise HTTPException(400, f"Bahan digunakan di menu '{menu_using['name']}', tidak bisa dihapus")
    
    result = await db.ingredients.delete_one({"_id": ObjectId(ingredient_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Bahan tidak ditemukan")
    return {"message": "Bahan dihapus"}


@app.post("/api/ingredients/adjust")
async def adjust_stock(data: StockAdjustment, user: dict = Depends(require_role("owner", "manager"))):
    """Manual stock adjustment (restock, waste, correction)"""
    ingredient = await db.ingredients.find_one({"_id": ObjectId(data.ingredient_id)})
    if not ingredient:
        raise HTTPException(404, "Bahan tidak ditemukan")
    
    new_qty = ingredient["stock_qty"] + data.qty_change
    if new_qty < 0:
        raise HTTPException(400, f"Stok tidak boleh negatif. Stok saat ini: {ingredient['stock_qty']}")
    
    # Update stock
    await db.ingredients.update_one(
        {"_id": ObjectId(data.ingredient_id)},
        {"$inc": {"stock_qty": data.qty_change}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    # Create adjustment ledger entry
    ledger_entry = {
        "type": "adjustment",
        "ingredient_id": data.ingredient_id,
        "delta_qty": data.qty_change,
        "reason": data.reason,
        "notes": data.notes,
        "user_id": user["_id"],
        "user_name": user["name"],
        "created_at": datetime.utcnow()
    }
    await db.stock_ledger.insert_one(ledger_entry)
    
    ingredient = await db.ingredients.find_one({"_id": ObjectId(data.ingredient_id)})
    return {"ingredient": serialize_doc(ingredient), "message": "Stok disesuaikan"}


# ============ MENU ENDPOINTS ============
@app.get("/api/menus")
async def list_menus(category: Optional[str] = None, active_only: bool = False):
    query = {}
    if category:
        query["category"] = category
    if active_only:
        query["is_active"] = True
    
    menus = await db.menus.find(query).sort("name", 1).to_list(500)
    return {"menus": serialize_doc(menus)}


@app.get("/api/menus/categories")
async def list_categories():
    categories = await db.menus.distinct("category")
    return {"categories": categories or ["Umum"]}


@app.post("/api/menus")
async def create_menu(data: MenuCreate, user: dict = Depends(require_role("owner", "manager"))):
    # Validate recipe ingredients exist
    for item in data.recipe:
        ing = await db.ingredients.find_one({"_id": ObjectId(item.ingredient_id)})
        if not ing:
            raise HTTPException(400, f"Bahan dengan ID {item.ingredient_id} tidak ditemukan")
    
    menu = {
        **data.model_dump(),
        "recipe": [r.model_dump() for r in data.recipe],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.menus.insert_one(menu)
    menu["_id"] = result.inserted_id
    return {"menu": serialize_doc(menu)}


@app.get("/api/menus/{menu_id}")
async def get_menu(menu_id: str):
    menu = await db.menus.find_one({"_id": ObjectId(menu_id)})
    if not menu:
        raise HTTPException(404, "Menu tidak ditemukan")
    return {"menu": serialize_doc(menu)}


@app.put("/api/menus/{menu_id}")
async def update_menu(menu_id: str, data: MenuUpdate, user: dict = Depends(require_role("owner", "manager"))):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "recipe":
                update_data[k] = [r.model_dump() if hasattr(r, 'model_dump') else r for r in v]
            else:
                update_data[k] = v
    
    if not update_data:
        raise HTTPException(400, "No data to update")
    
    update_data["updated_at"] = datetime.utcnow()
    result = await db.menus.update_one({"_id": ObjectId(menu_id)}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(404, "Menu tidak ditemukan")
    
    menu = await db.menus.find_one({"_id": ObjectId(menu_id)})
    return {"menu": serialize_doc(menu)}


@app.delete("/api/menus/{menu_id}")
async def delete_menu(menu_id: str, user: dict = Depends(require_role("owner"))):
    result = await db.menus.delete_one({"_id": ObjectId(menu_id)})
    if result.deleted_count == 0:
        raise HTTPException(404, "Menu tidak ditemukan")
    return {"message": "Menu dihapus"}


# ============ SALES ENDPOINTS ============
@app.post("/api/sales")
async def create_sale(data: SaleCreate):
    """Process a sale - deduct stock based on recipes"""
    # Check if sale already processed (idempotency)
    existing = await db.sales.find_one({"client_id": data.client_id})
    if existing:
        return {"sale": serialize_doc(existing), "status": "duplicate"}
    
    # Calculate ingredients needed
    ingredients_needed = {}
    for item in data.items:
        menu = await db.menus.find_one({"_id": ObjectId(item.menu_id)})
        if not menu:
            raise HTTPException(400, f"Menu tidak ditemukan: {item.menu_id}")
        
        for recipe_item in menu.get("recipe", []):
            ing_id = recipe_item["ingredient_id"]
            qty_needed = recipe_item["qty"] * item.qty
            ingredients_needed[ing_id] = ingredients_needed.get(ing_id, 0) + qty_needed
    
    # Check stock availability
    for ing_id, qty_needed in ingredients_needed.items():
        ing = await db.ingredients.find_one({"_id": ObjectId(ing_id)})
        if not ing:
            raise HTTPException(400, f"Bahan tidak ditemukan: {ing_id}")
        if ing["stock_qty"] < qty_needed:
            raise HTTPException(400, f"Stok {ing['name']} tidak cukup. Butuh: {qty_needed} {ing['unit']}, tersedia: {ing['stock_qty']} {ing['unit']}")
    
    # Create sale record
    created_at = datetime.fromisoformat(data.created_at.replace('Z', '+00:00')) if data.created_at else datetime.utcnow()
    sale = {
        "client_id": data.client_id,
        "items": [item.model_dump() for item in data.items],
        "total": data.total,
        "payment_method": data.payment_method,
        "notes": data.notes,
        "device_id": data.device_id,
        "created_at": created_at,
        "synced_at": datetime.utcnow()
    }
    
    try:
        result = await db.sales.insert_one(sale)
        sale["_id"] = result.inserted_id
    except Exception as e:
        if "duplicate" in str(e).lower():
            existing = await db.sales.find_one({"client_id": data.client_id})
            return {"sale": serialize_doc(existing), "status": "duplicate"}
        raise
    
    # Deduct stock with ledger entries
    for ing_id, qty_needed in ingredients_needed.items():
        # Create ledger entry
        try:
            await db.stock_ledger.insert_one({
                "sale_id": data.client_id,
                "ingredient_id": ing_id,
                "delta_qty": -qty_needed,
                "type": "sale",
                "created_at": datetime.utcnow()
            })
            # Deduct stock
            await db.ingredients.update_one(
                {"_id": ObjectId(ing_id)},
                {"$inc": {"stock_qty": -qty_needed}}
            )
        except Exception as e:
            if "duplicate" in str(e).lower():
                continue  # Already deducted
            raise
    
    return {"sale": serialize_doc(sale), "status": "created"}


@app.post("/api/sales/sync")
async def sync_sales(data: SyncBatchRequest):
    """Batch sync sales from offline storage"""
    results = []
    for sale_data in data.sales:
        try:
            result = await create_sale(sale_data)
            results.append({
                "client_id": sale_data.client_id,
                "status": result["status"],
                "success": True
            })
        except HTTPException as e:
            results.append({
                "client_id": sale_data.client_id,
                "status": "error",
                "success": False,
                "error": e.detail
            })
        except Exception as e:
            results.append({
                "client_id": sale_data.client_id,
                "status": "error",
                "success": False,
                "error": str(e)
            })
    
    return {
        "results": results,
        "synced": sum(1 for r in results if r["success"]),
        "failed": sum(1 for r in results if not r["success"])
    }


@app.get("/api/sales")
async def list_sales(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(50, le=500),
    skip: int = 0
):
    query = {}
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    total = await db.sales.count_documents(query)
    sales = await db.sales.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "sales": serialize_doc(sales),
        "total": total,
        "skip": skip,
        "limit": limit
    }


@app.get("/api/sales/paginated")
async def list_sales_paginated(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    user: dict = Depends(require_role("owner", "manager"))
):
    """Paginated sales list with search"""
    query = {}
    
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    if search:
        # Search in client_id or items.menu_name
        query["$or"] = [
            {"client_id": {"$regex": search, "$options": "i"}},
            {"items.menu_name": {"$regex": search, "$options": "i"}}
        ]
    
    total = await db.sales.count_documents(query)
    total_pages = (total + per_page - 1) // per_page
    
    skip = (page - 1) * per_page
    sales = await db.sales.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    
    return {
        "sales": serialize_doc(sales),
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


@app.get("/api/sales/{sale_id}")
async def get_sale(sale_id: str):
    sale = await db.sales.find_one({"_id": ObjectId(sale_id)})
    if not sale:
        raise HTTPException(404, "Transaksi tidak ditemukan")
    return {"sale": serialize_doc(sale)}


# ============ REPORTS ENDPOINTS ============
@app.get("/api/reports/summary")
async def get_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get sales summary for a period"""
    match = {}
    if start_date:
        match["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in match:
            match["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            match["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    # Total sales
    pipeline = [
        {"$match": match} if match else {"$match": {}},
        {"$group": {
            "_id": None,
            "total_revenue": {"$sum": "$total"},
            "total_transactions": {"$sum": 1}
        }}
    ]
    result = await db.sales.aggregate(pipeline).to_list(1)
    summary = result[0] if result else {"total_revenue": 0, "total_transactions": 0}
    
    # Top menus
    top_menus_pipeline = [
        {"$match": match} if match else {"$match": {}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.menu_name",
            "qty_sold": {"$sum": "$items.qty"},
            "revenue": {"$sum": "$items.subtotal"}
        }},
        {"$sort": {"qty_sold": -1}},
        {"$limit": 10}
    ]
    top_menus = await db.sales.aggregate(top_menus_pipeline).to_list(10)
    
    # Low stock items
    low_stock = await db.ingredients.find({
        "$expr": {"$lte": ["$stock_qty", "$low_stock_threshold"]}
    }).to_list(20)
    
    return {
        "total_revenue": summary.get("total_revenue", 0),
        "total_transactions": summary.get("total_transactions", 0),
        "top_menus": top_menus,
        "low_stock_count": len(low_stock),
        "low_stock_items": serialize_doc(low_stock)
    }


@app.get("/api/reports/daily")
async def get_daily_report(days: int = Query(7, le=90)):
    """Get daily sales for the last N days"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$group": {
            "_id": {
                "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}
            },
            "revenue": {"$sum": "$total"},
            "transactions": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    results = await db.sales.aggregate(pipeline).to_list(days)
    return {
        "daily": [{"date": r["_id"], "revenue": r["revenue"], "transactions": r["transactions"]} for r in results]
    }


@app.get("/api/reports/ingredient-usage")
async def get_ingredient_usage(days: int = Query(7, le=90)):
    """Get ingredient usage from ledger"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "type": "sale"}},
        {"$group": {
            "_id": "$ingredient_id",
            "total_used": {"$sum": {"$abs": "$delta_qty"}}
        }},
        {"$sort": {"total_used": -1}}
    ]
    
    usage = await db.stock_ledger.aggregate(pipeline).to_list(50)
    
    # Enrich with ingredient names
    for item in usage:
        ing = await db.ingredients.find_one({"_id": ObjectId(item["_id"])})
        if ing:
            item["name"] = ing["name"]
            item["unit"] = ing["unit"]
    
    return {"usage": usage}


# ============ SETTINGS ENDPOINTS ============
@app.get("/api/settings")
async def get_settings():
    settings = await db.settings.find_one({"type": "store"})
    if not settings:
        return {"settings": StoreSettings().model_dump()}
    return {"settings": serialize_doc(settings)}


@app.put("/api/settings")
async def update_settings(data: StoreSettings, user: dict = Depends(require_role("owner"))):
    await db.settings.update_one(
        {"type": "store"},
        {"$set": {**data.model_dump(), "type": "store", "updated_at": datetime.utcnow()}},
        upsert=True
    )
    settings = await db.settings.find_one({"type": "store"})
    return {"settings": serialize_doc(settings)}


# ============ INGREDIENT LEDGER ENDPOINTS ============
@app.get("/api/ingredients/{ingredient_id}/ledger")
async def get_ingredient_ledger(
    ingredient_id: str,
    days: int = Query(30, le=365),
    limit: int = Query(100, le=500)
):
    """Get stock ledger history for a specific ingredient"""
    ingredient = await db.ingredients.find_one({"_id": ObjectId(ingredient_id)})
    if not ingredient:
        raise HTTPException(404, "Bahan tidak ditemukan")
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    ledger = await db.stock_ledger.find({
        "ingredient_id": ingredient_id,
        "created_at": {"$gte": start_date}
    }).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Calculate running balance (newest to oldest, so reverse for calculation)
    current_stock = ingredient["stock_qty"]
    ledger_with_balance = []
    
    # Start from current stock and work backwards
    running_balance = current_stock
    for entry in ledger:
        entry["balance_after"] = running_balance
        running_balance -= entry["delta_qty"]  # Reverse the change to get balance before
        entry["balance_before"] = running_balance
        ledger_with_balance.append(entry)
    
    # Summary stats
    sales_total = sum(abs(e["delta_qty"]) for e in ledger if e.get("type") == "sale")
    adjustments = [e for e in ledger if e.get("type") == "adjustment"]
    restock_total = sum(e["delta_qty"] for e in adjustments if e["delta_qty"] > 0)
    waste_total = sum(abs(e["delta_qty"]) for e in adjustments if e["delta_qty"] < 0)
    
    return {
        "ingredient": serialize_doc(ingredient),
        "ledger": serialize_doc(ledger_with_balance),
        "summary": {
            "period_days": days,
            "total_entries": len(ledger),
            "sales_usage": sales_total,
            "restock_total": restock_total,
            "waste_total": waste_total,
            "current_stock": current_stock
        }
    }


# ============ EXPORT ENDPOINTS ============
@app.get("/api/reports/export/sales")
async def export_sales_csv(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: dict = Depends(require_role("owner", "manager"))
):
    """Export sales data to CSV"""
    query = {}
    if start_date:
        query["created_at"] = {"$gte": datetime.fromisoformat(start_date)}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = datetime.fromisoformat(end_date)
        else:
            query["created_at"] = {"$lte": datetime.fromisoformat(end_date)}
    
    sales = await db.sales.find(query).sort("created_at", -1).to_list(10000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Tanggal", "ID Transaksi", "Item", "Jumlah Item", 
        "Total (Rp)", "Metode Bayar", "Catatan", "Device ID"
    ])
    
    # Data rows
    for sale in sales:
        items_str = "; ".join([f"{item['menu_name']} x{item['qty']}" for item in sale.get("items", [])])
        total_items = sum(item["qty"] for item in sale.get("items", []))
        
        writer.writerow([
            sale["created_at"].strftime("%Y-%m-%d %H:%M:%S") if isinstance(sale["created_at"], datetime) else sale["created_at"],
            sale.get("client_id", ""),
            items_str,
            total_items,
            sale.get("total", 0),
            sale.get("payment_method", ""),
            sale.get("notes", ""),
            sale.get("device_id", "")
        ])
    
    output.seek(0)
    
    filename = f"penjualan_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/reports/export/ingredients")
async def export_ingredients_csv(
    user: dict = Depends(require_role("owner", "manager"))
):
    """Export ingredients/stock data to CSV"""
    ingredients = await db.ingredients.find().sort("name", 1).to_list(1000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Nama Bahan", "Satuan", "Stok Saat Ini", "Batas Minimum", 
        "Status", "Harga per Satuan (Rp)"
    ])
    
    # Data rows
    for ing in ingredients:
        status = "HABIS" if ing["stock_qty"] == 0 else (
            "MENIPIS" if ing["stock_qty"] <= ing.get("low_stock_threshold", 0) else "CUKUP"
        )
        
        writer.writerow([
            ing["name"],
            ing["unit"],
            ing["stock_qty"],
            ing.get("low_stock_threshold", 0),
            status,
            ing.get("price_per_unit", 0)
        ])
    
    output.seek(0)
    
    filename = f"stok_bahan_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/api/reports/export/usage")
async def export_usage_csv(
    days: int = Query(30, le=365),
    user: dict = Depends(require_role("owner", "manager"))
):
    """Export ingredient usage history to CSV"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all ledger entries
    ledger = await db.stock_ledger.find({
        "created_at": {"$gte": start_date}
    }).sort("created_at", -1).to_list(10000)
    
    # Enrich with ingredient names
    ingredients_cache = {}
    for entry in ledger:
        ing_id = entry.get("ingredient_id")
        if ing_id and ing_id not in ingredients_cache:
            ing = await db.ingredients.find_one({"_id": ObjectId(ing_id)})
            if ing:
                ingredients_cache[ing_id] = {"name": ing["name"], "unit": ing["unit"]}
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Tanggal", "Bahan", "Satuan", "Perubahan", "Tipe", 
        "Alasan", "Catatan", "ID Transaksi/User"
    ])
    
    # Data rows
    for entry in ledger:
        ing_info = ingredients_cache.get(entry.get("ingredient_id"), {"name": "Unknown", "unit": ""})
        entry_type = entry.get("type", "unknown")
        reason = entry.get("reason", "-") if entry_type == "adjustment" else "-"
        ref_id = entry.get("sale_id", entry.get("user_name", "-"))
        
        writer.writerow([
            entry["created_at"].strftime("%Y-%m-%d %H:%M:%S") if isinstance(entry["created_at"], datetime) else entry["created_at"],
            ing_info["name"],
            ing_info["unit"],
            entry.get("delta_qty", 0),
            "Penjualan" if entry_type == "sale" else "Penyesuaian",
            reason,
            entry.get("notes", ""),
            ref_id
        ])
    
    output.seek(0)
    
    filename = f"pemakaian_bahan_{days}hari_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ============ BACKUP/RESTORE ENDPOINTS ============
@app.get("/api/backup")
async def backup_data(user: dict = Depends(require_role("owner"))):
    """Export all data as JSON for backup"""
    backup = {
        "version": "1.0",
        "created_at": datetime.utcnow().isoformat(),
        "created_by": user["email"],
        "data": {}
    }
    
    # Export ingredients
    ingredients = await db.ingredients.find().to_list(10000)
    backup["data"]["ingredients"] = serialize_doc(ingredients)
    
    # Export menus
    menus = await db.menus.find().to_list(10000)
    backup["data"]["menus"] = serialize_doc(menus)
    
    # Export sales (last 90 days)
    ninety_days_ago = datetime.utcnow() - timedelta(days=90)
    sales = await db.sales.find({"created_at": {"$gte": ninety_days_ago}}).to_list(50000)
    backup["data"]["sales"] = serialize_doc(sales)
    
    # Export stock ledger (last 90 days)
    ledger = await db.stock_ledger.find({"created_at": {"$gte": ninety_days_ago}}).to_list(100000)
    backup["data"]["stock_ledger"] = serialize_doc(ledger)
    
    # Export settings
    settings = await db.settings.find_one({"type": "store"})
    backup["data"]["settings"] = serialize_doc(settings) if settings else None
    
    # Export users (without passwords)
    users = await db.users.find({}, {"password": 0}).to_list(100)
    backup["data"]["users"] = serialize_doc(users)
    
    # Create JSON response
    json_str = json.dumps(backup, indent=2, ensure_ascii=False, default=str)
    
    filename = f"kedaiops_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    return StreamingResponse(
        iter([json_str]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.post("/api/restore")
async def restore_data(
    restore_ingredients: bool = True,
    restore_menus: bool = True,
    restore_settings: bool = True,
    user: dict = Depends(require_role("owner"))
):
    """
    Restore data from backup JSON (uploaded as request body)
    Note: Sales and ledger are NOT restored to prevent duplication
    """
    # This endpoint expects the backup JSON to be sent as request body
    # For simplicity, we'll use a simpler approach - restore from uploaded data
    raise HTTPException(501, "Restore endpoint requires file upload. Use /api/restore/preview first.")


@app.post("/api/restore/ingredients")
async def restore_ingredients_endpoint(
    data: RestoreIngredientsRequest,
    mode: str = Query("merge", regex="^(merge|replace)$"),
    user: dict = Depends(require_role("owner"))
):
    """Restore ingredients from backup data"""
    ingredients = data.ingredients
    if mode == "replace":
        # Check if any menu uses these ingredients
        menus = await db.menus.find({"recipe.0": {"$exists": True}}).to_list(1)
        if menus:
            raise HTTPException(400, "Tidak bisa replace ingredients karena ada menu dengan resep")
        await db.ingredients.delete_many({})
    
    restored = 0
    skipped = 0
    
    for ing in ingredients:
        # Remove _id for insert
        ing_data = {k: v for k, v in ing.items() if k != "_id"}
        ing_data["created_at"] = datetime.utcnow()
        ing_data["updated_at"] = datetime.utcnow()
        
        # Check if exists
        existing = await db.ingredients.find_one({"name": ing_data["name"]})
        if existing:
            if mode == "merge":
                # Update stock if higher
                if ing_data.get("stock_qty", 0) > existing.get("stock_qty", 0):
                    await db.ingredients.update_one(
                        {"_id": existing["_id"]},
                        {"$set": {"stock_qty": ing_data["stock_qty"], "updated_at": datetime.utcnow()}}
                    )
                    restored += 1
                else:
                    skipped += 1
            else:
                skipped += 1
        else:
            await db.ingredients.insert_one(ing_data)
            restored += 1
    
    return {
        "message": f"Restore selesai. {restored} ditambahkan/diperbarui, {skipped} dilewati.",
        "restored": restored,
        "skipped": skipped
    }


@app.post("/api/restore/menus")
async def restore_menus_endpoint(
    data: RestoreMenusRequest,
    mode: str = Query("merge", regex="^(merge|replace)$"),
    user: dict = Depends(require_role("owner"))
):
    """Restore menus from backup data"""
    menus = data.menus
    if mode == "replace":
        await db.menus.delete_many({})
    
    restored = 0
    skipped = 0
    
    for menu in menus:
        # Remove _id for insert
        menu_data = {k: v for k, v in menu.items() if k != "_id"}
        menu_data["created_at"] = datetime.utcnow()
        menu_data["updated_at"] = datetime.utcnow()
        
        # Check if exists
        existing = await db.menus.find_one({"name": menu_data["name"]})
        if existing:
            if mode == "merge":
                skipped += 1
            else:
                skipped += 1
        else:
            await db.menus.insert_one(menu_data)
            restored += 1
    
    return {
        "message": f"Restore selesai. {restored} ditambahkan, {skipped} dilewati.",
        "restored": restored,
        "skipped": skipped
    }


@app.get("/api/stock-ledger/paginated")
async def list_ledger_paginated(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    ingredient_id: Optional[str] = None,
    type_filter: Optional[str] = None,
    days: int = Query(30, le=365),
    user: dict = Depends(require_role("owner", "manager"))
):
    """Paginated stock ledger with filters"""
    start_date = datetime.utcnow() - timedelta(days=days)
    query = {"created_at": {"$gte": start_date}}
    
    if ingredient_id:
        query["ingredient_id"] = ingredient_id
    if type_filter:
        query["type"] = type_filter
    
    total = await db.stock_ledger.count_documents(query)
    total_pages = (total + per_page - 1) // per_page
    
    skip = (page - 1) * per_page
    ledger = await db.stock_ledger.find(query).sort("created_at", -1).skip(skip).limit(per_page).to_list(per_page)
    
    # Enrich with ingredient names
    for entry in ledger:
        ing_id = entry.get("ingredient_id")
        if ing_id:
            ing = await db.ingredients.find_one({"_id": ObjectId(ing_id)})
            if ing:
                entry["ingredient_name"] = ing["name"]
                entry["ingredient_unit"] = ing["unit"]
    
    return {
        "ledger": serialize_doc(ledger),
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
