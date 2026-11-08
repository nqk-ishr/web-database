"""Báo cáo thống kê cho cán bộ và quản trị."""
import datetime as dt
from typing import Optional

from fastapi import APIRouter, Depends

from app.core.config import ADMIN, INSURANCE, VIOLATION
from app.core.security import need
from app.services import report as svc

router = APIRouter()


@router.get("/reports/violations")
def report_violations(from_date: Optional[dt.date] = None, to_date: Optional[dt.date] = None,
                      u=Depends(need(VIOLATION, ADMIN))):
    return svc.violations_report(from_date, to_date)


@router.get("/reports/unpaid-fines")
def report_unpaid(u=Depends(need(VIOLATION, ADMIN))):
    return svc.unpaid_fines_report()


@router.get("/reports/insurance")
def report_insurance(u=Depends(need(INSURANCE, ADMIN))):
    return svc.insurance_report(u)
