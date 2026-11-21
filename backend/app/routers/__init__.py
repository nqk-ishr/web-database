"""Gom tất cả router. Dùng trong main.py:

    from fastapi import FastAPI
    from app.routers import router

    app = FastAPI()
    app.include_router(router)
"""
from fastapi import APIRouter

from app.routers.officer import claims, reports, requests as officer_requests, violations as officer_violations
from app.routers.owner import insurance, me, requests as owner_requests, violations as owner_violations

router = APIRouter()
for module in (me, owner_requests, owner_violations, insurance,
               officer_requests, officer_violations, claims, reports):
    router.include_router(module.router)
