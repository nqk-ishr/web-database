import { useNavigate } from "react-router-dom";
import { useVehicleSearch, useVehicleTypes } from "../../hooks/useStaff";
import PagedTable, { StatusTabs } from "../../components/staff/PagedTable";
import StatusBadge from "../../components/domain/StatusBadge";
import { PageHeader } from "../../components/ui/Field";
import { FilterBar, SearchInput, SelectFilter } from "../../components/ui/Filters";
import { VEHICLE_STATUS } from "../../constants/status";

const TABS = [
  { key: "", label: "Tất cả" }, { key: "normal", label: "Bình thường" },
  { key: "stolen", label: "Báo mất" }, { key: "revoked", label: "Đã thu hồi" },
];
const COLUMNS = [
  { key: "plate_number", header: "Biển số", render: (v) => <b>{v.plate_number}</b> },
  { key: "vehicle_type", header: "Loại xe" },
  { key: "manufacture_year", header: "Năm SX" },
  { key: "chassis_number", header: "Số khung" },
  { key: "current_owner", header: "Chủ hiện hành" },
  { key: "status", header: "Trạng thái", render: (v) => <StatusBadge map={VEHICLE_STATUS} status={v.status} /> },
];

// Tra cứu phương tiện (cán bộ đăng ký). Tab "Báo mất" là danh sách xe chờ ghi nhận tìm thấy / thu hồi.
export default function VehicleSearchPage({ base = "/registrar/vehicles" }) {
  const nav = useNavigate();
  const types = useVehicleTypes();
  const list = useVehicleSearch({});
  const p = list.params;
  const typeOptions = [{ value: "", label: "Tất cả" },
    ...(types.data ?? []).map((t) => ({ value: String(t.vehicle_type_id), label: `${t.name} (${t.usage_purpose})` }))];
  return (
    <>
      <PageHeader title="Tra cứu phương tiện" subtitle="Tìm theo biển số, số khung, số máy, tên hoặc CCCD chủ xe." />
      <StatusTabs tabs={TABS} value={p.status ?? ""} onChange={(status) => list.setFilter({ status })} />
      <FilterBar>
        <SearchInput label="Tìm kiếm" placeholder="Biển số, số khung, chủ xe…" value={p.q} onChange={(q) => list.setFilter({ q })} />
        <SelectFilter label="Loại xe" value={p.vehicle_type_id} options={typeOptions}
          onChange={(vehicle_type_id) => list.setFilter({ vehicle_type_id })} />
      </FilterBar>
      <PagedTable list={list} columns={COLUMNS} rowKey="vehicle_id" empty="Không tìm thấy xe nào."
        onRowClick={(v) => nav(`${base}/${v.vehicle_id}`)} />
    </>
  );
}
