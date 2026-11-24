import { useMemo, useState } from "react";
import { useToast } from "../../components/ui/Toast";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Pagination from "../../components/ui/Pagination";
import DataTable from "../../components/ui/DataTable";
import { Field, PageHeader } from "../../components/ui/Field";
import { FilterBar, SearchInput, SelectFilter, DateRange } from "../../components/ui/Filters";
import StatusBadge from "../../components/domain/StatusBadge";
import { errorMessage } from "../../utils/errors";
import * as S from "../../constants/status";

// Trang xem thử thành phần dùng chung (chỉ có khi chạy `npm run dev`): http://localhost:5173/ui-kit
const ROWS = Array.from({ length: 47 }, (_, i) => ({
  id: i + 1, plate: `30A-${String(100 + i).padStart(3, "0")}.${String(10 + i)}`,
  type: i % 2 ? "transfer" : "new_registration",
  status: ["pending_approval", "needs_more_info", "approved", "rejected"][i % 4],
}));

export default function UiKitPage() {
  const toast = useToast();
  const [dialog, setDialog] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [range, setRange] = useState({ from_date: "", to_date: "" });
  const size = 10;

  const filtered = useMemo(() => ROWS.filter((r) => (!q || r.plate.includes(q.toUpperCase())) && (!type || r.type === type)), [q, type]);
  const pages = Math.ceil(filtered.length / size);
  const rows = filtered.slice((page - 1) * size, page * size);
  const cols = [
    { key: "plate", header: "Biển số" },
    { key: "type", header: "Loại", render: (r) => <StatusBadge map={S.REQUEST_TYPE} status={r.type} /> },
    { key: "status", header: "Trạng thái", render: (r) => <StatusBadge map={S.REQUEST_STATUS} status={r.status} /> },
  ];
  const fakeAxios422 = { response: { status: 422, data: { detail: [{ loc: ["body", "chassis_number"], msg: "Field required" }] } } };

  return (
    <>
      <PageHeader title="Thành phần dùng chung" subtitle="Trang xem thử, chỉ có ở chế độ phát triển"
        actions={<button className="btn btn2" type="button" onClick={() => toast.info("Đây là thông báo thông tin")}>Toast</button>} />

      <section className="card">
        <h2>Thông báo</h2>
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <button className="btn" type="button" onClick={() => toast.success("Đã nộp phạt thành công")}>Thành công</button>
          <button className="btn btn2" type="button" onClick={() => toast.error("Xe còn vi phạm chưa nộp phạt")}>Lỗi (chuỗi)</button>
          <button className="btn btn2" type="button" onClick={() => toast.error(fakeAxios422)}>Lỗi 422</button>
        </div>
        <p className="muted">Lỗi 422 hiển thị: {errorMessage(fakeAxios422)}</p>
      </section>

      <section className="card">
        <h2>Hộp xác nhận</h2>
        <div className="row" style={{ justifyContent: "flex-start" }}>
          <button className="btn" type="button" onClick={() => setDialog("plain")}>Xác nhận thường</button>
          <button className="btn danger" type="button" onClick={() => setDialog("note")}>Từ chối (bắt buộc lý do)</button>
        </div>
      </section>
      <ConfirmDialog open={dialog === "plain"} title="Nộp phạt" message="Bạn xác nhận nộp 4.000.000 đ?"
        onCancel={() => setDialog(null)} onConfirm={() => { setDialog(null); toast.success("Đã xác nhận"); }} />
      <ConfirmDialog open={dialog === "note"} title="Từ chối hồ sơ" danger confirmText="Từ chối"
        note={{ label: "Lý do từ chối", required: true, placeholder: "Nhập lý do…" }}
        onCancel={() => setDialog(null)} onConfirm={(text) => { setDialog(null); toast.info(`Lý do: ${text}`); }} />

      <section className="card">
        <h2>Biểu mẫu</h2>
        <div className="grid">
          <Field label="Số khung" hint="Tối đa 30 ký tự"><input defaultValue="" /></Field>
          <Field label="Số máy" error="Số máy đã có trong hệ thống"><input defaultValue="EN5521098" /></Field>
          <Field label="Loại xe"><select><option>Ô tô con</option><option>Xe máy</option></select></Field>
          <Field label="Mô tả"><textarea /></Field>
        </div>
      </section>

      <h2>Bảng, bộ lọc, phân trang</h2>
      <FilterBar>
        <SearchInput label="Biển số" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="vd. 30A-105" />
        <SelectFilter label="Loại hồ sơ" value={type} onChange={(v) => { setType(v); setPage(1); }}
          options={[{ value: "", label: "Tất cả" }, { value: "new_registration", label: "Đăng ký mới" }, { value: "transfer", label: "Sang tên" }]} />
        <DateRange from={range.from_date} to={range.to_date} onChange={(p) => setRange((r) => ({ ...r, ...p }))} />
      </FilterBar>
      <DataTable columns={cols} rows={rows} rowKey="id" empty="Không có hồ sơ phù hợp." onRowClick={(r) => toast.info(`Mở hồ sơ ${r.plate}`)} />
      <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />

      <section className="card">
        <h2>Nhãn trạng thái</h2>
        {Object.entries({ VEHICLE_STATUS: S.VEHICLE_STATUS, VIOLATION_STATUS: S.VIOLATION_STATUS, POLICY_STATUS: S.POLICY_STATUS,
          REQUEST_STATUS: S.REQUEST_STATUS, CLAIM_STATUS: S.CLAIM_STATUS, CLAIM_TYPE: S.CLAIM_TYPE, PAYMENT_STATUS: S.PAYMENT_STATUS }).map(([name, map]) => (
          <div key={name} className="row" style={{ justifyContent: "flex-start" }}>
            <span className="muted" style={{ minWidth: 170 }}>{name}</span>
            {Object.keys(map).map((k) => <StatusBadge key={k} map={map} status={k} />)}
          </div>
        ))}
      </section>
    </>
  );
}
