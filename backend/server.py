from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
import uuid

# ---------------------------
# ENV LOAD
# ---------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "railway")

if not MONGO_URL:
    raise Exception("MONGO_URL environment variable not set!")

# ---------------------------
# APP INIT
# ---------------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ---------------------------
# DB CONNECTION
# ---------------------------
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

@app.on_event("startup")
async def startup_db_check():
    try:
        await db.command("ping")
        print("✅ MongoDB Connected")
    except Exception as e:
        print("❌ MongoDB Error:", e)

# ---------------------------
# MODELS
# ---------------------------
class User(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    restaurant_id: Optional[str] = None


class Restaurant(BaseModel):
    id: str
    name: str
    address: str
    phone: str
    owner_id: str
    created_at: datetime


# ---------------------------
# AUTH (şimdilik basit)
# ---------------------------
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials

    # Token decode sistemi sonra eklenir
    # Şimdilik admin kabul ediyoruz debug için

    user = await db.users.find_one({"role": "admin"})
    if not user:
        raise HTTPException(status_code=401, detail="Admin not found")

    user["_id"] = str(user["_id"])
    return user


# ---------------------------
# DEBUG ENDPOINT
# ---------------------------
@app.get("/debug-users")
async def debug_users():
    users = []
    async for user in db.users.find():
        user["_id"] = str(user["_id"])
        users.append(user)

    return {"count": len(users), "users": users}


# ---------------------------
# ADMIN ENDPOINTS
# ---------------------------
@api_router.get("/admin/users")
async def list_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    users = []
    async for user in db.users.find():
        user["_id"] = str(user["_id"])
        users.append(user)

    return users


@api_router.get("/admin/restaurants")
async def get_all_restaurants(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    restaurants = []
    async for r in db.restaurants.find():
        r["_id"] = str(r["_id"])
        restaurants.append(r)

    return restaurants


@api_router.delete("/admin/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    await db.restaurants.delete_one({"id": restaurant_id})
    await db.users.delete_many({"restaurant_id": restaurant_id})

    return {"message": "Restaurant deleted"}


# ---------------------------
# ROUTER REGISTER
# ---------------------------
app.include_router(api_router)

# ---------------------------
# REACT BUILD SERVE
# ---------------------------
app.mount("/", StaticFiles(directory="frontend/build", html=True), name="static")

@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="Not Found")
    return FileResponse("frontend/build/index.html")
