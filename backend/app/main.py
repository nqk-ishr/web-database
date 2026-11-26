"""Điểm vào của backend FastAPI.

Chạy:  uvicorn app.main:app --host 0.0.0.0 --port 8000
Tài liệu API (OpenAPI): /api/docs
"""
import psycopg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import CORS_ORIGINS
from app.db.session import q1, tx
from app.routers import router

app = FastAPI(title="Hệ thống quản lý phương tiện giao thông", version="1.0.0",
              docs_url="/api/docs", openapi_url="/api/openapi.json", redoc_url=None)

app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=False,
                   allow_methods=["*"], allow_headers=["*"])


@app.exception_handler(psycopg.OperationalError)
async def db_unavailable(request, exc):
    return JSONResponse({"detail": "Không kết nối được cơ sở dữ liệu, vui lòng thử lại sau"}, status_code=503)


@app.get("/api/health", tags=["system"])
def health():
    """Kiểm tra sống: dùng cho Docker healthcheck / load balancer."""
    with tx() as cur:
        q1(cur, "SELECT 1")
    return {"status": "ok"}


app.include_router(router, prefix="/api")
