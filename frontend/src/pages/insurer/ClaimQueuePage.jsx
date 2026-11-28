import { useNavigate } from "react-router-dom";
import { useClaimQueue } from "../../hooks/useStaff";
import PagedTable, { StatusTabs, optionsFrom } from "../../components/staff/PagedTable";
import StatusBadge from "../../components/domain/StatusBadge";
import { PageHeader } from "../../components/ui/Field";
import { DateRange, FilterBar, SearchInput, SelectFilter } from "../../components/ui/Filters";
import { CLAIM_STATUS, CLAIM_TYPE } from "../../constants/status";
import { dateTime, money } from "../../utils/format";

const TABS = [
  { key: "pending_review", label: "Chờ thẩm định" }, { key: "needs_more_info", label: "Cần bổ sung" },
  { key: "approved", label: "Đã duyệt, chờ chi trả" }, { key: "paid", label: "Đã chi trả" },
  { key: "rejected", label: "Từ chối" }, { key: "cancelled", label: "Đã hủy" }, { key: "all", label: "Tất cả" },
];
const SORT = [{ value: "oldest", label: "Cũ nhất trước" }, { value: "newest", label: "Mới nhất trước" }];

const COLUMNS = [
  { key: "claim_id", header: "Mã", render: (c) => `#${c.claim_id}` },
  { key: "claim_type", header: "Loại", render: (c) => <StatusBadge map={CLAIM_TYPE} status={c.claim_type} /> },
  { key: "plate_number", header: "Biển số" },
  { key: "certificate_code", header: "Giấy chứng nhận" },
  { key: "claimant_name", header: "Người yêu cầu" },
  { key: "event_time", header: "Thời điểm sự kiện", render: (c) => dateTime(c.event_time) },
  { key: "requested_amount", header: "Đề nghị", render: (c) => money(c.requested_amount) },
  { key: "approved_amount", header: "Đã duyệt", render: (c) => money(c.approved_amount) },
  { key: "status", header: "Trạng thái", render: (c) => <StatusBadge map={CLAIM_STATUS} status={c.status} /> },
];

// Nhân viên bảo hiểm: yêu cầu bồi thường của công ty mình (backend tự lọc theo công ty)
export default function ClaimQueuePage() {
  const nav = useNavigate();
  const list = useClaimQueue({ status: "pending_review", sort: "oldest" });
  const p = list.params;
  return (
    <>
      <PageHeader title="Yêu cầu bồi thường" subtitle="Thẩm định, duyệt và ghi nhận chi trả." />
      <StatusTabs tabs={TABS} value={p.status} onChange={(status) => list.setFilter({ status })} />
      <FilterBar>
        <SearchInput label="Tìm kiếm" placeholder="Biển số, mã giấy chứng nhận, tên…" value={p.q} onChange={(q) => list.setFilter({ q })} />
        <SelectFilter label="Loại" value={p.claim_type} options={optionsFrom(CLAIM_TYPE)} onChange={(claim_type) => list.setFilter({ claim_type })} />
        <DateRange from={p.from_date} to={p.to_date} onChange={list.setFilter} />
        <SelectFilter label="Sắp xếp" value={p.sort} options={SORT} onChange={(sort) => list.setFilter({ sort })} />
      </FilterBar>
      <PagedTable list={list} columns={COLUMNS} rowKey="claim_id" empty="Không có yêu cầu nào khớp bộ lọc."
        onRowClick={(c) => nav(`/insurer/claims/${c.claim_id}`)} />
    </>
  );
}
