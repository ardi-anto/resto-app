"""
MongoDB Models for Coffee Stock Management System
"""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from bson import ObjectId


# ============ HELPERS ============
class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, values=None):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            return v
        raise ValueError("Invalid ObjectId")


def serialize_doc(doc):
    """Serialize MongoDB document for JSON response"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for k, v in doc.items():
            if isinstance(v, ObjectId):
                result[k] = str(v)
            elif isinstance(v, datetime):
                result[k] = v.isoformat()
            elif isinstance(v, list):
                result[k] = serialize_doc(v)
            elif isinstance(v, dict):
                result[k] = serialize_doc(v)
            else:
                result[k] = v
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    if isinstance(doc, datetime):
        return doc.isoformat()
    return doc


# ============ INGREDIENT MODELS ============
class RecipeItem(BaseModel):
    ingredient_id: str
    qty: float


class IngredientCreate(BaseModel):
    name: str
    unit: str  # gram, ml, pcs, kotak
    stock_qty: float = 0
    low_stock_threshold: float = 0
    price_per_unit: float = 0  # optional cost tracking


class IngredientUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    stock_qty: Optional[float] = None
    low_stock_threshold: Optional[float] = None
    price_per_unit: Optional[float] = None


class StockAdjustment(BaseModel):
    ingredient_id: str
    qty_change: float  # positive or negative
    reason: str  # restock, waste, correction
    notes: Optional[str] = None


# ============ MENU MODELS ============
class MenuCreate(BaseModel):
    name: str
    category: str = "Umum"
    price: float
    recipe: List[RecipeItem] = []
    is_active: bool = True
    image_url: Optional[str] = None


class MenuUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    recipe: Optional[List[RecipeItem]] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None


# ============ SALE MODELS ============
class SaleItem(BaseModel):
    menu_id: str
    menu_name: str
    qty: int
    price: float
    subtotal: float


class SaleCreate(BaseModel):
    client_id: str  # UUID from client for idempotency
    items: List[SaleItem]
    total: float
    payment_method: str = "cash"
    notes: Optional[str] = None
    device_id: str = "unknown"
    created_at: Optional[str] = None  # ISO string from client


class SyncBatchRequest(BaseModel):
    sales: List[SaleCreate]


# ============ USER/AUTH MODELS ============
class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "kasir"  # owner, manager, kasir


class UserLogin(BaseModel):
    email: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


# ============ SETTINGS MODELS ============
class StoreSettings(BaseModel):
    store_name: str = "Kedai Kopi"
    address: Optional[str] = None
    phone: Optional[str] = None
    footer_text: Optional[str] = "Terima kasih!"
    # Print settings
    print_width: str = "80mm"  # 58mm or 80mm
    show_logo: bool = False
    auto_print: bool = False

