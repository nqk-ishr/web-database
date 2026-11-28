import { useNavigate } from "react-router-dom";
import { useRequestQueue } from "../../hooks/useStaff";
import PagedTable, { StatusTabs, optionsFrom } from "../../components/staff/PagedTable";
import StatusBadge from "../../components/domain/StatusBadge";
import { PageHeader } from "../../components/ui/Field";
import { DateRange, FilterBar, SearchInput, SelectFilter } from "../../components/ui/Filters";
import { REQUEST_STATUS, REQUEST_TYPE } from "../../constants/status";
import { dateTime } from "../../utils/format";

const TABS = [
  { key: "pending_approval", label: "Chờ duyệt" },
  { key: "needs_more_info", label: "Cần bổ sung" },
  { key: "pending_confirmation", label: "Chờ bên mua" },
  { key: "approved", label: "Đã duyệt" },
  { key: "rejected", label: "Từ chối" },
  { key: "cancelled", label: "Đã hủy" },
  { key: "all", label: "Tất cả" },
];
const SORT = [{ value: "oldest", label: "Cũ nhất trước" }, { value: "newest", label: "Mới nhất trước" }];

const COLUMNS = [
  { key: "request_id", header: "Mã", render: (r) => `#${r.request_id}` },
  { key: "request_type", header: "Loại", render: (r) => <StatusBadge map={REQUEST_TYPE} status={r.request_type} /> },
  { key: "vehicle", header: "Xe", render: (r) => r.plate_number ?? `${r.declared_vehicle_type ?? "Xe mới"} · khung ${r.declared_chassis_number ?? "–"}` },
  { key: "people", header: "Người gửi / bên mua", render: (r) => (r.buyer_name ? `${r.requester_name} → ${r.buyer_name}` : r.requester_name) },
  { key: "submitted_at", header: "Ngày gửi", render: (r) => dateTime(r.submitted_at) },
  { key: "status", header: "Trạng thái", render: (r) => <StatusBadge map={REQUEST_STATUS} status={r.status} /> },
];

// Cán bộ đăng ký: hàng đợi hồ sơ đăng ký mới và sang tên (mặc định: Chờ duyệt, cũ nhất trước)
export default function RequestQueuePage() {
  const nav = useNavigate();
  const list = useRequestQueue({ status: "pending_approval", sort: "oldest" });
  const p = list.params;
  return (
    <>
      <PageHeader title="Hồ sơ đăng ký và sang tên" subtitle="Duyệt hồ sơ, cấp biển số, cập nhật chủ sở hữu." />
      <StatusTabs tabs={TABS} value={p.status} onChange={(status) => list.setFilter({ status })} />
      <FilterBar>
        <SearchInput label="Tìm kiếm" placeholder="Biển số, số khung, tên, CCCD…" value={p.q} onChange={(q) => list.setFilter({ q })} />
        <SelectFilter label="Loại hồ sơ" value={p.request_type} options={optionsFrom(REQUEST_TYPE)}
          onChange={(request_type) => list.setFilter({ request_type })} />
        <DateRange from={p.from_date} to={p.to_date} onChange={list.setFilter} />
        <SelectFilter label="Sắp xếp" value={p.sort} options={SORT} onChange={(sort) => list.setFilter({ sort })} />
      </FilterBar>
      <PagedTable list={list} columns={COLUMNS} rowKey="request_id" empty="Không có hồ sơ nào khớp bộ lọc."
        onRowClick={(r) => nav(`/registrar/requests/${r.request_id}`)} />
    </>
  );
}
