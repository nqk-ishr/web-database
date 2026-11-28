import { useAuditLog } from "../../hooks/useStaff";
import PagedTable from "../../components/staff/PagedTable";
import { PageHeader } from "../../components/ui/Field";
import { DateRange, FilterBar, SelectFilter } from "../../components/ui/Filters";
import { dateTime } from "../../utils/format";

// Mã thao tác backend ghi vào audit_log (services/*.py, routers/admin.py)
const ACTIONS = {
  "request.approve": "Duyệt hồ sơ", "request.reject": "Từ chối hồ sơ", "request.request_info": "Yêu cầu bổ sung hồ sơ",
  "vehicle.found": "Ghi nhận xe tìm thấy", "vehicle.revoked": "Thu hồi đăng ký xe",
  "violation.verify": "Xác minh vi phạm", "violation.notify": "Ra quyết định xử phạt", "violation.cancel": "Hủy vi phạm",
  "claim.approved": "Duyệt bồi thường", "claim.rejected": "Từ chối bồi thường", "claim.needs_more_info": "Yêu cầu bổ sung bồi thường",
  "claim.paid": "Chi trả bồi thường",
  "user.create": "Tạo tài khoản", "user.update": "Sửa tài khoản", "user.activate": "Mở khóa tài khoản",
  "user.deactivate": "Khóa tài khoản", "user.reset_password": "Đặt lại mật khẩu",
};
const ENTITIES = {
  registration_request: "Hồ sơ", vehicle: "Xe", violation: "Vi phạm", insurance_claim: "Yêu cầu bồi thường", user: "Tài khoản",
};
const toOptions = (m) => [{ value: "", label: "Tất cả" }, ...Object.entries(m).map(([value, label]) => ({ value, label }))];

const COLUMNS = [
  { key: "created_at", header: "Thời điểm", render: (a) => dateTime(a.created_at) },
  { key: "actor", header: "Người thực hiện" },
  { key: "action", header: "Thao tác", render: (a) => ACTIONS[a.action] ?? a.action },
  { key: "entity", header: "Đối tượng", render: (a) => `${ENTITIES[a.entity_type] ?? a.entity_type} #${a.entity_id ?? "–"}` },
  { key: "detail", header: "Chi tiết", render: (a) => (a.detail && Object.keys(a.detail).length
    ? <code className="muted">{JSON.stringify(a.detail)}</code> : "–") },
];

// Quản trị: nhật ký thao tác của cán bộ và quản trị, mới nhất trước
export default function AuditLogPage() {
  const list = useAuditLog({});
  const p = list.params;
  return (
    <>
      <PageHeader title="Nhật ký thao tác" subtitle="Ghi lại mọi thao tác duyệt, xử lý và quản trị tài khoản." />
      <FilterBar>
        <SelectFilter label="Thao tác" value={p.action} options={toOptions(ACTIONS)} onChange={(action) => list.setFilter({ action })} />
        <SelectFilter label="Đối tượng" value={p.entity_type} options={toOptions(ENTITIES)} onChange={(entity_type) => list.setFilter({ entity_type })} />
        <DateRange from={p.from_date} to={p.to_date} onChange={list.setFilter} />
      </FilterBar>
      <PagedTable list={list} columns={COLUMNS} rowKey="audit_id" empty="Chưa có thao tác nào." />
    </>
  );
}
