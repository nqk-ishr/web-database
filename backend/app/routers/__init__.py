"""Gom tất cả router. Dùng trong main.py:

    from app.routers import router
    app.include_router(router, prefix="/api")

THỨ TỰ QUAN TRỌNG: các route cố định (/violations/mine, /vehicles/mine) phải được nạp TRƯỚC
các route có tham số cùng tiền tố (/violations/{vid}, /vehicles/{vid}); nếu không "mine" sẽ bị
hiểu là một mã và trả 422.
"""
from fastapi import APIRouter

from app.routers import admin, auth, catalog, details
from app.routers.officer import (claims, reports, requests as officer_requests,
                                 vehicles as officer_vehicles, violations as officer_violations)
from app.routers.owner import (insurance, me, requests as owner_requests, vehicles as owner_vehicles,
                               violations as owner_violations)

router = APIRouter()
for module in (auth, admin, catalog, me, owner_vehicles, officer_vehicles, owner_violations, owner_requests,
               insurance, officer_requests, officer_violations, claims, reports, details):
    router.include_router(module.router)
