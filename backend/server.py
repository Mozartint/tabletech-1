from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import qrcode
import io
import base64

# 🔴 ÖNCE app oluşturulur
app = FastAPI()

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# 🔴 ENV'den Mongo al
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "railway")

if not MONGO_URL:
    raise Exception("MONGO_URL environment variable not set!")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

@app.get("/debug-users")
async def debug_users():
    try:
        users_cursor = db.users.find()
        users = []

        async for user in users_cursor:
            # Mongo ObjectId sorununu temizle
            if "_id" in user:
                user["_id"] = str(user["_id"])
            users.append(user)

        return {
            "status": "ok",
            "count": len(users),
            "users": users
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }
    
@app.get("/debug-env")
async def debug_env():
    return {
        "MONGO_URL": os.environ.get("MONGO_URL"),
        "DB_NAME": os.environ.get("DB_NAME")
    }
# 🔴 Startup'ta DB kontrolü yapılır
@app.on_event("startup")
async def startup_db_check():
    try:
        await db.command("ping")
        print("✅ MongoDB Connected")
    except Exception as e:
        print("❌ MongoDB Connection Error:", e)
# React build klasörünü yayınla (frontend)
FRONTEND_BUILD_PATH = ROOT_DIR / "frontend" / "build"

if FRONTEND_BUILD_PATH.exists():
    app.mount(
        "/",
        StaticFiles(directory=FRONTEND_BUILD_PATH, html=True),
        name="frontend",
    )
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: str
    restaurant_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    restaurant_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Restaurant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    phone: str
    owner_id: str

    # ✅ YENİ — özellik yetkileri
    kasa_enabled: bool = False
    mutfak_enabled: bool = False

    subscription_status: str = "active"
    subscription_end_date: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantCreate(BaseModel):
    name: str
    address: str
    phone: str
    owner_email: EmailStr
    owner_password: str
    owner_full_name: str

    # ✅ Admin restoran açarken seçebilecek
    kasa_enabled: bool = False
    mutfak_enabled: bool = False

class Table(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_number: str
    qr_code: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TableCreate(BaseModel):
    table_number: str

class MenuCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    name: str
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuCategoryCreate(BaseModel):
    name: str
    order: int = 0

class MenuItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    category_id: str
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    available: bool = True
    preparation_time_minutes: int = 10
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    category_id: str
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    available: bool = True
    preparation_time_minutes: int = 10

class OrderItem(BaseModel):
    menu_item_id: str
    name: str
    price: float
    quantity: int
    preparation_time_minutes: int = 10

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_id: str
    table_number: str
    items: List[OrderItem]
    total_amount: float
    payment_method: str
    status: str = "pending"
    estimated_completion_minutes: int = 15
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrderCreate(BaseModel):
    table_id: str
    items: List[OrderItem]
    payment_method: str

class OrderStatusUpdate(BaseModel):
    status: str

class OrderPaymentUpdate(BaseModel):
    payment_status: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    order_id: Optional[str] = None
    rating: int
    comment: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    restaurant_id: str
    order_id: Optional[str] = None
    rating: int
    comment: str

class WaiterCall(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: str
    table_id: str
    table_number: str
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WaiterCallCreate(BaseModel):
    table_id: str

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    if isinstance(user['created_at'], str):
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        role=user_data.role,
        restaurant_id=user_data.restaurant_id
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['password'] = hash_password(user_data.password)
    
    await db.users.insert_one(doc)
    return user

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc or not verify_password(credentials.password, user_doc.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user_doc.pop('password', None)
    user = User(**user_doc)
    
    access_token = create_access_token(data={"sub": user.id})
    return Token(access_token=access_token, token_type="bearer", user=user)

@api_router.post("/admin/restaurants", response_model=Restaurant)
async def create_restaurant(data: RestaurantCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # -------------------------
    # OWNER OLUŞTUR
    # -------------------------
    owner = User(
        email=data.owner_email,
        full_name=data.owner_full_name,
        role="owner"
    )

    restaurant = Restaurant(
        name=data.name,
        address=data.address,
        phone=data.phone,
        owner_id=owner.id,
        subscription_end_date=datetime.now(timezone.utc) + timedelta(days=30)
    )

    owner.restaurant_id = restaurant.id

    owner_doc = owner.model_dump()
    owner_doc["created_at"] = owner_doc["created_at"].isoformat()
    owner_doc["password"] = hash_password(data.owner_password)

    await db.users.insert_one(owner_doc)

    # -------------------------
    # RESTORANI KAYDET
    # -------------------------
    restaurant_doc = restaurant.model_dump()
    restaurant_doc["created_at"] = restaurant_doc["created_at"].isoformat()
    restaurant_doc["subscription_end_date"] = restaurant_doc["subscription_end_date"].isoformat()

    await db.restaurants.insert_one(restaurant_doc)

    # -------------------------
    # KASA HESABI OLUŞTUR (İSTENİRSE)
    # -------------------------
    if data.kasa_enabled:
        cashier_user = User(
            email=f"kasa@{restaurant.id}.local",
            full_name=f"{restaurant.name} Kasası",
            role="cashier",
            restaurant_id=restaurant.id
        )

        cashier_doc = cashier_user.model_dump()
        cashier_doc["created_at"] = cashier_doc["created_at"].isoformat()
        cashier_doc["password"] = hash_password("123456")  # ilk şifre

        await db.users.insert_one(cashier_doc)

    # -------------------------
    # MUTFAK HESABI OLUŞTUR (İSTENİRSE)
    # -------------------------
    if data.mutfak_enabled:
        kitchen_user = User(
            email=f"mutfak@{restaurant.id}.local",
            full_name=f"{restaurant.name} Mutfağı",
            role="kitchen",
            restaurant_id=restaurant.id
        )

        kitchen_doc = kitchen_user.model_dump()
        kitchen_doc["created_at"] = kitchen_doc["created_at"].isoformat()
        kitchen_doc["password"] = hash_password("123456")

        await db.users.insert_one(kitchen_doc)

    return restaurant
    
@api_router.get("/admin/users")
async def list_users(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    users = []
    cursor = db.users.find({})

    async for user in cursor:
        user["_id"] = str(user["_id"])  # Mongo ObjectId fix
        users.append(user)

    return users
    
@api_router.delete("/admin/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    await db.restaurants.delete_one({"id": restaurant_id})
    await db.users.delete_many({"restaurant_id": restaurant_id})
    await db.tables.delete_many({"restaurant_id": restaurant_id})
    await db.menu_categories.delete_many({"restaurant_id": restaurant_id})
    await db.menu_items.delete_many({"restaurant_id": restaurant_id})
    await db.orders.delete_many({"restaurant_id": restaurant_id})
    
    return {"message": "Restaurant deleted"}

@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    total_restaurants = await db.restaurants.count_documents({})
    active_restaurants = await db.restaurants.count_documents({"subscription_status": "active"})
    total_orders = await db.orders.count_documents({})
    
    orders = await db.orders.find({}, {"_id": 0, "total_amount": 1}).to_list(10000)
    total_revenue = sum(order.get("total_amount", 0) for order in orders)
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.count_documents({
        "created_at": {"$gte": today_start.isoformat()}
    })
    
    return {
        "total_restaurants": total_restaurants,
        "active_restaurants": active_restaurants,
        "total_orders": total_orders,
        "total_revenue": round(total_revenue, 2),
        "today_orders": today_orders
    }

@api_router.get("/admin/orders", response_model=List[Order])
async def get_all_orders(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for o in orders:
        if isinstance(o.get('created_at'), str):
            o['created_at'] = datetime.fromisoformat(o['created_at'])
        if isinstance(o.get('updated_at'), str):
            o['updated_at'] = datetime.fromisoformat(o['updated_at'])
    return orders

@api_router.get("/admin/restaurants/{restaurant_id}/staff")
async def get_restaurant_staff(restaurant_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    staff = await db.users.find(
        {"restaurant_id": restaurant_id},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    for s in staff:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
    
    return staff

@api_router.get("/admin/analytics")
async def get_admin_analytics(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    daily_orders = []
    for i in range(6, -1, -1):
        day_start = (datetime.now(timezone.utc) - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        count = await db.orders.count_documents({
            "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
        })
        
        orders = await db.orders.find(
            {"created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}},
            {"_id": 0, "total_amount": 1}
        ).to_list(10000)
        
        revenue = sum(order.get("total_amount", 0) for order in orders)
        
        daily_orders.append({
            "date": day_start.strftime("%d.%m"),
            "orders": count,
            "revenue": round(revenue, 2)
        })
    
    restaurants = await db.restaurants.find({}, {"_id": 0}).to_list(1000)
    restaurant_stats = []
    
    for restaurant in restaurants:
        order_count = await db.orders.count_documents({"restaurant_id": restaurant["id"]})
        orders = await db.orders.find(
            {"restaurant_id": restaurant["id"]},
            {"_id": 0, "total_amount": 1}
        ).to_list(10000)
        revenue = sum(order.get("total_amount", 0) for order in orders)
        
        restaurant_stats.append({
            "name": restaurant["name"],
            "orders": order_count,
            "revenue": round(revenue, 2)
        })
    
    restaurant_stats.sort(key=lambda x: x["orders"], reverse=True)
    
    return {
        "daily_orders": daily_orders,
        "restaurant_stats": restaurant_stats[:10]
    }

@api_router.get("/owner/stats")
async def get_owner_stats(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_orders = await db.orders.find(
        {
            "restaurant_id": current_user.restaurant_id,
            "created_at": {"$gte": today_start.isoformat()}
        },
        {"_id": 0}
    ).to_list(10000)
    
    today_count = len(today_orders)
    today_revenue = sum(order.get("total_amount", 0) for order in today_orders)
    
    week_start = (datetime.now(timezone.utc) - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
    week_orders = await db.orders.find(
        {
            "restaurant_id": current_user.restaurant_id,
            "created_at": {"$gte": week_start.isoformat()}
        },
        {"_id": 0}
    ).to_list(10000)
    
    week_count = len(week_orders)
    week_revenue = sum(order.get("total_amount", 0) for order in week_orders)
    
    status_counts = {
        "pending": 0,
        "preparing": 0,
        "ready": 0,
        "completed": 0
    }
    
    all_orders = await db.orders.find(
        {"restaurant_id": current_user.restaurant_id},
        {"_id": 0, "status": 1}
    ).to_list(10000)
    
    for order in all_orders:
        status = order.get("status", "pending")
        if status in status_counts:
            status_counts[status] += 1
    
    item_counts = {}
    for order in all_orders:
        for item in order.get("items", []):
            name = item.get("name", "")
            if name:
                item_counts[name] = item_counts.get(name, 0) + item.get("quantity", 0)
    
    popular_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:5]
    popular_items = [{"name": name, "count": count} for name, count in popular_items]
    
    daily_stats = []
    for i in range(6, -1, -1):
        day_start = (datetime.now(timezone.utc) - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        
        day_orders = await db.orders.find(
            {
                "restaurant_id": current_user.restaurant_id,
                "created_at": {"$gte": day_start.isoformat(), "$lt": day_end.isoformat()}
            },
            {"_id": 0, "total_amount": 1}
        ).to_list(10000)
        
        count = len(day_orders)
        revenue = sum(order.get("total_amount", 0) for order in day_orders)
        
        daily_stats.append({
            "date": day_start.strftime("%d.%m"),
            "orders": count,
            "revenue": round(revenue, 2)
        })
    
    return {
        "today": {
            "orders": today_count,
            "revenue": round(today_revenue, 2)
        },
        "week": {
            "orders": week_count,
            "revenue": round(week_revenue, 2)
        },
        "status_distribution": status_counts,
        "popular_items": popular_items,
        "daily_stats": daily_stats
    }

@api_router.get("/owner/menu/categories", response_model=List[MenuCategory])
async def get_categories(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    categories = await db.menu_categories.find(
        {"restaurant_id": current_user.restaurant_id}, {"_id": 0}
    ).sort("order", 1).to_list(1000)
    
    for c in categories:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return categories

@api_router.post("/owner/menu/categories", response_model=MenuCategory)
async def create_category(data: MenuCategoryCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    category = MenuCategory(
        restaurant_id=current_user.restaurant_id,
        name=data.name,
        order=data.order
    )
    
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menu_categories.insert_one(doc)
    
    return category

@api_router.put("/owner/menu/categories/{category_id}", response_model=MenuCategory)
async def update_category(category_id: str, data: MenuCategoryCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    await db.menu_categories.update_one(
        {"id": category_id, "restaurant_id": current_user.restaurant_id},
        {"$set": {"name": data.name, "order": data.order}}
    )
    
    category_doc = await db.menu_categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(category_doc.get('created_at'), str):
        category_doc['created_at'] = datetime.fromisoformat(category_doc['created_at'])
    return MenuCategory(**category_doc)

@api_router.delete("/owner/menu/categories/{category_id}")
async def delete_category(category_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    await db.menu_categories.delete_one({"id": category_id, "restaurant_id": current_user.restaurant_id})
    await db.menu_items.delete_many({"category_id": category_id})
    return {"message": "Category deleted"}

@api_router.get("/owner/menu/items", response_model=List[MenuItem])
async def get_menu_items(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    items = await db.menu_items.find(
        {"restaurant_id": current_user.restaurant_id}, {"_id": 0}
    ).to_list(1000)
    
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.post("/owner/menu/items", response_model=MenuItem)
async def create_menu_item(data: MenuItemCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    item = MenuItem(
        restaurant_id=current_user.restaurant_id,
        category_id=data.category_id,
        name=data.name,
        description=data.description,
        price=data.price,
        image_url=data.image_url,
        available=data.available,
        preparation_time_minutes=data.preparation_time_minutes
    )
    
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.menu_items.insert_one(doc)
    
    return item

@api_router.put("/owner/menu/items/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: str, data: MenuItemCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    update_data = data.model_dump()
    await db.menu_items.update_one(
        {"id": item_id, "restaurant_id": current_user.restaurant_id},
        {"$set": update_data}
    )
    
    item_doc = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    if isinstance(item_doc.get('created_at'), str):
        item_doc['created_at'] = datetime.fromisoformat(item_doc['created_at'])
    return MenuItem(**item_doc)

@api_router.delete("/owner/menu/items/{item_id}")
async def delete_menu_item(item_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    await db.menu_items.delete_one({"id": item_id, "restaurant_id": current_user.restaurant_id})
    return {"message": "Menu item deleted"}

@api_router.get("/owner/tables", response_model=List[Table])
async def get_tables(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    tables = await db.tables.find(
        {"restaurant_id": current_user.restaurant_id}, {"_id": 0}
    ).to_list(1000)
    
    for t in tables:
        if isinstance(t.get('created_at'), str):
            t['created_at'] = datetime.fromisoformat(t['created_at'])
    return tables

@api_router.post("/owner/tables", response_model=Table)
async def create_table(data: TableCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    table = Table(
        restaurant_id=current_user.restaurant_id,
        table_number=data.table_number,
        qr_code=""
    )
    
    qr_data = f"https://tabletech-1-production.up.railway.app/menu/{table.id}"
    table.qr_code = generate_qr_code(qr_data)
    
    doc = table.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.tables.insert_one(doc)
    
    return table

@api_router.delete("/owner/tables/{table_id}")
async def delete_table(table_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    await db.tables.delete_one({"id": table_id, "restaurant_id": current_user.restaurant_id})
    return {"message": "Table deleted"}

@api_router.get("/owner/orders", response_model=List[Order])
async def get_owner_orders(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    orders = await db.orders.find(
        {"restaurant_id": current_user.restaurant_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    for o in orders:
        if isinstance(o.get('created_at'), str):
            o['created_at'] = datetime.fromisoformat(o['created_at'])
        if isinstance(o.get('updated_at'), str):
            o['updated_at'] = datetime.fromisoformat(o['updated_at'])
    return orders

@api_router.get("/kitchen/orders", response_model=List[Order])
async def get_kitchen_orders(current_user: User = Depends(get_current_user)):
    if current_user.role != "kitchen":
        raise HTTPException(status_code=403, detail="Kitchen only")
    
    orders = await db.orders.find(
        {"restaurant_id": current_user.restaurant_id, "status": {"$in": ["pending", "preparing"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    for o in orders:
        if isinstance(o.get('created_at'), str):
            o['created_at'] = datetime.fromisoformat(o['created_at'])
        if isinstance(o.get('updated_at'), str):
            o['updated_at'] = datetime.fromisoformat(o['updated_at'])
    return orders

@api_router.put("/kitchen/orders/{order_id}/status")
async def update_order_status(order_id: str, data: OrderStatusUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "kitchen":
        raise HTTPException(status_code=403, detail="Kitchen only")
    
    await db.orders.update_one(
        {"id": order_id, "restaurant_id": current_user.restaurant_id},
        {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Order status updated"}

@api_router.get("/cashier/orders", response_model=List[Order])
async def get_cashier_orders(current_user: User = Depends(get_current_user)):
    if current_user.role != "cashier":
        raise HTTPException(status_code=403, detail="Cashier only")
    
    orders = await db.orders.find(
        {"restaurant_id": current_user.restaurant_id, "payment_method": "cash", "status": {"$ne": "completed"}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    for o in orders:
        if isinstance(o.get('created_at'), str):
            o['created_at'] = datetime.fromisoformat(o['created_at'])
        if isinstance(o.get('updated_at'), str):
            o['updated_at'] = datetime.fromisoformat(o['updated_at'])
    return orders

@api_router.put("/cashier/orders/{order_id}/payment")
async def update_order_payment(order_id: str, data: OrderPaymentUpdate, current_user: User = Depends(get_current_user)):
    if current_user.role != "cashier":
        raise HTTPException(status_code=403, detail="Cashier only")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.payment_status == "paid":
        update_fields["status"] = "completed"
    
    await db.orders.update_one(
        {"id": order_id, "restaurant_id": current_user.restaurant_id},
        {"$set": update_fields}
    )
    return {"message": "Payment updated"}

@api_router.get("/public/menu/{table_id}")
async def get_menu_by_table(table_id: str):
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    restaurant = await db.restaurants.find_one({"id": table["restaurant_id"]}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    categories = await db.menu_categories.find(
        {"restaurant_id": table["restaurant_id"]}, {"_id": 0}
    ).sort("order", 1).to_list(1000)
    
    items = await db.menu_items.find(
        {"restaurant_id": table["restaurant_id"], "available": True}, {"_id": 0}
    ).to_list(1000)
    
    return {
        "restaurant": restaurant,
        "table": table,
        "categories": categories,
        "items": items
    }

@api_router.post("/orders", response_model=Order)
async def create_order(data: OrderCreate):
    table = await db.tables.find_one({"id": data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    max_prep_time = max([item.preparation_time_minutes for item in data.items], default=15)
    
    order = Order(
        restaurant_id=table["restaurant_id"],
        table_id=data.table_id,
        table_number=table["table_number"],
        items=data.items,
        total_amount=sum(item.price * item.quantity for item in data.items),
        payment_method=data.payment_method,
        status="pending",
        estimated_completion_minutes=max_prep_time
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.orders.insert_one(doc)
    
    return order

@api_router.post("/reviews", response_model=Review)
async def create_review(data: ReviewCreate):
    review = Review(
        restaurant_id=data.restaurant_id,
        order_id=data.order_id,
        rating=data.rating,
        comment=data.comment
    )
    
    doc = review.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.reviews.insert_one(doc)
    
    return review

@api_router.post("/waiter-call", response_model=WaiterCall)
async def call_waiter(data: WaiterCallCreate):
    table = await db.tables.find_one({"id": data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    waiter_call = WaiterCall(
        restaurant_id=table["restaurant_id"],
        table_id=data.table_id,
        table_number=table["table_number"],
        status="pending"
    )
    
    doc = waiter_call.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.waiter_calls.insert_one(doc)
    
    return waiter_call

@api_router.get("/admin/reviews", response_model=List[Review])
async def get_all_reviews(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for r in reviews:
        if isinstance(r.get('created_at'), str):
            r['created_at'] = datetime.fromisoformat(r['created_at'])
    return reviews

@api_router.get("/owner/waiter-calls")
async def get_waiter_calls(current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    calls = await db.waiter_calls.find(
        {"restaurant_id": current_user.restaurant_id, "status": "pending"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for c in calls:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    return calls

@api_router.put("/owner/waiter-calls/{call_id}")
async def resolve_waiter_call(call_id: str, current_user: User = Depends(get_current_user)):
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Owner only")
    
    await db.waiter_calls.update_one(
        {"id": call_id, "restaurant_id": current_user.restaurant_id},
        {"$set": {"status": "resolved"}}
    )
    return {"message": "Waiter call resolved"}

# ÖNCE API router'ı ekle
app.include_router(api_router)

# SONRA middleware ekle
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# API ROUTER'I EKLE (ÇOK ÖNEMLİ)
# -----------------------------
app.include_router(api_router)


# -----------------------------
# REACT BUILD PATH
# -----------------------------
frontend_path = Path("frontend/build")


# -----------------------------
# STATIC DOSYALAR (JS, CSS vs.)
# React'in static klasörünü serve ediyoruz
# -----------------------------
if (frontend_path / "static").exists():
    app.mount(
        "/static",
        StaticFiles(directory=frontend_path / "static"),
        name="static",
    )


# -----------------------------
# REACT INDEX SERVE (ANA SAYFA)
# -----------------------------
@app.get("/")
async def serve_root():
    index_file = frontend_path / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    raise HTTPException(status_code=404, detail="React build bulunamadı")


# -----------------------------
# REACT ROUTER DESTEK (CATCH-ALL)
# /api HARİÇ TÜM ROUTE'LARI REACT'E VER
# -----------------------------
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # API endpointlerine dokunma!
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route")

    index_file = frontend_path / "index.html"
    if index_file.exists():
        return FileResponse(index_file)

    raise HTTPException(status_code=404, detail="Sayfa bulunamadı")


# -----------------------------
# LOGGING
# -----------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# -----------------------------
# SHUTDOWN EVENT
# -----------------------------
@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
