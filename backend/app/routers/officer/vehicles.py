"""Cán bộ tra cứu phương tiện (biển số, số khung, số máy, chủ xe)."""
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.config import ADMIN, REGISTRAR, VIOLATION
from app.core.pagination import PageParams, like, paginate
from app.core.security import need
from app.db.session import tx
from app.schemas.filters import VehicleStatusF

router = APIRouter(tags=["vehicles"])

SELECT = """
    v.vehicle_id, v.plate_number, v.chassis_number, v.engine_number, v.manufacture_year, v.status,
    vt.name AS vehicle_type, ow.user_id AS current_owner_id, ow.full_name AS current_owner"""
FROM = """
    FROM vehicles v
    JOIN vehicle_types vt         ON vt.vehicle_type_id = v.vehicle_type_id
    LEFT JOIN ownership_history oh ON oh.vehicle_id = v.vehicle_id AND oh.valid_to IS NULL
    LEFT JOIN users ow            ON ow.user_id = oh.owner_id"""


@router.get("/vehicles")
def search_vehicles(search: Optional[str] = Query(None, alias="q", max_length=100,
                                                  description="Biển số, số khung, số máy, tên hoặc CCCD chủ xe"),
                    status: Optional[VehicleStatusF] = None, vehicle_type_id: Optional[int] = None,
                    pg: PageParams = Depends(), u=Depends(need(REGISTRAR, VIOLATION, ADMIN))):
    where, args = [], {}
    if search:
        where.append("""(v.plate_number ILIKE %(s)s OR v.chassis_number ILIKE %(s)s OR v.engine_number ILIKE %(s)s
                         OR ow.full_name ILIKE %(s)s OR ow.citizen_id ILIKE %(s)s)""")
        args["s"] = like(search)
    if status:
        where.append("v.status = %(status)s")
        args["status"] = status
    if vehicle_type_id:
        where.append("v.vehicle_type_id = %(vt)s")
        args["vt"] = vehicle_type_id
    with tx() as cur:
        return paginate(cur, SELECT, FROM, where, args, "v.plate_number, v.vehicle_id", pg)
