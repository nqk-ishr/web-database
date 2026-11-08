"""Báo cáo thống kê (chỉ đọc)."""
from app.core.config import INSURANCE, LATE_FEE_RATE, TODAY, TZ
from app.db.session import q, tx


def violations_report(from_date, to_date):
    """Báo cáo 1: số vi phạm và tiền phạt theo loại lỗi, theo tháng, theo trạng thái."""
    day = f"(v.occurred_at AT TIME ZONE '{TZ}')::date"
    where = f"WHERE (%(f)s::date IS NULL OR {day} >= %(f)s::date) AND (%(t)s::date IS NULL OR {day} <= %(t)s::date)"
    p = {"f": from_date, "t": to_date}
    sel = "count(*) AS violations, COALESCE(SUM(v.fine_amount), 0) AS total_fine"
    with tx() as cur:
        return {
            "by_type": q(cur, f"""SELECT t.code AS violation_type, {sel} FROM violations v
                                  JOIN violation_types t USING (violation_type_id) {where}
                                  GROUP BY t.code ORDER BY violations DESC""", p),
            "by_month": q(cur, f"""SELECT to_char(v.occurred_at AT TIME ZONE '{TZ}', 'YYYY-MM') AS month, {sel}
                                   FROM violations v {where} GROUP BY 1 ORDER BY 1""", p),
            "by_status": q(cur, f"SELECT v.status, {sel} FROM violations v {where} GROUP BY v.status ORDER BY 1", p),
        }


def unpaid_fines_report():
    """Báo cáo 2: xe và chủ xe còn phạt chưa nộp (Đã xác minh / Đã thông báo), kèm phạt trễ tính đến hôm nay."""
    overdue = f"(v.status = 'notified' AND v.due_date < {TODAY})"
    with tx() as cur:
        return q(cur, f"""
            SELECT ve.plate_number, u.full_name AS owner, count(*) AS violations,
                   COALESCE(SUM(v.fine_amount), 0) AS total_fine,
                   count(*) FILTER (WHERE {overdue}) AS overdue_violations,
                   COALESCE(SUM(CASE WHEN {overdue}
                       THEN ROUND(v.fine_amount * {LATE_FEE_RATE} * ({TODAY} - v.due_date)) END), 0) AS late_fee
            FROM violations v
            JOIN vehicles ve USING (vehicle_id)
            JOIN users u ON u.user_id = v.liable_owner_id
            WHERE v.status IN ('verified', 'notified')
            GROUP BY ve.vehicle_id, ve.plate_number, u.user_id, u.full_name
            ORDER BY total_fine DESC""")


def insurance_report(u):
    """Báo cáo 3: hợp đồng sắp hết hạn trong 30 ngày; phí thu và tiền bồi thường theo tháng, theo loại xe.
    Nhân viên bảo hiểm chỉ thấy số liệu công ty mình; quản trị thấy tất cả."""
    ins = u["insurer_id"] if u["role"] == INSURANCE else None
    p = {"ins": ins}
    flt = "(%(ins)s::int IS NULL OR pr.insurer_id = %(ins)s::int)"
    join = """JOIN insurance_policies po ON po.policy_id = {k}.policy_id
              JOIN insurance_products pr ON pr.product_id = po.product_id"""
    with tx() as cur:
        return {
            "expiring_30_days": q(cur, f"""
                SELECT po.certificate_code, ve.plate_number, po.end_date, i.name AS insurer
                FROM insurance_policies po
                JOIN insurance_products pr USING (product_id)
                JOIN insurers i USING (insurer_id)
                JOIN vehicles ve USING (vehicle_id)
                WHERE po.status = 'active' AND po.end_date BETWEEN {TODAY} AND {TODAY} + 30 AND {flt}
                ORDER BY po.end_date""", p),
            "premium_by_month": q(cur, f"""
                SELECT to_char(pp.paid_at AT TIME ZONE '{TZ}', 'YYYY-MM') AS month, SUM(pp.amount) AS premium
                FROM policy_payments pp {join.format(k='pp')}
                WHERE pp.status = 'success' AND {flt} GROUP BY 1 ORDER BY 1""", p),
            "payout_by_month": q(cur, f"""
                SELECT to_char(c.paid_at AT TIME ZONE '{TZ}', 'YYYY-MM') AS month, SUM(c.approved_amount) AS payout
                FROM insurance_claims c {join.format(k='c')}
                WHERE c.status = 'paid' AND {flt} GROUP BY 1 ORDER BY 1""", p),
            "by_vehicle_type": q(cur, f"""
                SELECT * FROM (
                  SELECT vt.name AS vehicle_type, vt.usage_purpose,
                    COALESCE((SELECT SUM(pp.amount) FROM policy_payments pp {join.format(k='pp')}
                              JOIN vehicles ve ON ve.vehicle_id = po.vehicle_id
                              WHERE pp.status = 'success' AND ve.vehicle_type_id = vt.vehicle_type_id AND {flt}), 0) AS premium,
                    COALESCE((SELECT SUM(c.approved_amount) FROM insurance_claims c {join.format(k='c')}
                              JOIN vehicles ve ON ve.vehicle_id = po.vehicle_id
                              WHERE c.status = 'paid' AND ve.vehicle_type_id = vt.vehicle_type_id AND {flt}), 0) AS payout
                  FROM vehicle_types vt) x
                WHERE premium > 0 OR payout > 0 ORDER BY premium DESC""", p),
        }
