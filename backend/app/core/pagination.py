"""Phân trang và lọc dùng chung cho các danh sách.

Quy ước kết quả:  {"items": [...], "total": N, "page": 1, "size": 20, "pages": M}
Mọi mảnh SQL (select / from / where / order) do code cố định viết; dữ liệu người dùng
chỉ đi qua tham số %(tên)s nên không có nguy cơ SQL injection.
"""
import datetime as dt
import math

from fastapi import HTTPException, Query

from app.core.config import TZ
from app.db.session import q, q1


class PageParams:
    """Dùng: pg: PageParams = Depends()"""

    def __init__(self,
                 page: int = Query(1, ge=1, description="Trang, bắt đầu từ 1"),
                 size: int = Query(20, ge=1, le=100, description="Số dòng mỗi trang (tối đa 100)")):
        self.page, self.size = page, size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


def like(text: str) -> str:
    """Mẫu ILIKE 'chứa' đã thoát ký tự đặc biệt (% _ \\)."""
    esc = text.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{esc}%"


def add_date_range(where: list, args: dict, column: str,
                   from_date: dt.date | None, to_date: dt.date | None) -> None:
    """Lọc theo NGÀY (giờ Việt Nam) cho cột kiểu timestamptz."""
    if from_date and to_date and from_date > to_date:
        raise HTTPException(400, "from_date phải nhỏ hơn hoặc bằng to_date")
    expr = f"({column} AT TIME ZONE '{TZ}')::date"
    if from_date:
        where.append(f"{expr} >= %(from_date)s")
        args["from_date"] = from_date
    if to_date:
        where.append(f"{expr} <= %(to_date)s")
        args["to_date"] = to_date


def paginate(cur, select: str, frm: str, where: list, args: dict, order: str, pg: PageParams) -> dict:
    cond = (" WHERE " + " AND ".join(where)) if where else ""
    total = q1(cur, f"SELECT count(*) AS n {frm}{cond}", args)["n"]
    items = q(cur, f"SELECT {select} {frm}{cond} ORDER BY {order} LIMIT %(_limit)s OFFSET %(_offset)s",
              {**args, "_limit": pg.size, "_offset": pg.offset})
    return {"items": items, "total": total, "page": pg.page, "size": pg.size,
            "pages": math.ceil(total / pg.size) if total else 0}
