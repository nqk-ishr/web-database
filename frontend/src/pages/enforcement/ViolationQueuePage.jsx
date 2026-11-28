import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCameras, useRecordViolation, useViolationQueue, useViolationTypes } from "../../hooks/useStaff";
import PagedTable, { StatusTabs } from "../../components/staff/PagedTable";
import FormDialog from "../../components/staff/FormDialog";
import StatusBadge from "../../components/domain/StatusBadge";
import { Field, PageHeader } from "../../components/ui/Field";
import { DateRange, FilterBar, SearchInput, SelectFilter } from "../../components/ui/Filters";
import { useToast } from "../../components/ui/Toast";
import { VIOLATION_STATUS } from "../../constants/status";
import { dateTime, money } from "../../utils/format";

const TABS = [
  { key: "recorded", label: "Mới ghi nhận" }, { key: "verified", label: "Đã xác minh" },
  { key: "notified", label: "Đã thông báo" }, { key: "paid", label: "Đã nộp" },
  { key: "cancelled", label: "Đã hủy" }, { key: "all", label: "Tất cả" },
];
const SORT = [{ value: "oldest", label: "Cũ nhất trước" }, { value: "newest", label: "Mới nhất trước" }];

const COLUMNS = [
  { key: "violation_id", header: "Mã", render: (v) => `#${v.violation_id}` },
  { key: "occurred_at", header: "Thời điểm", render: (v) => dateTime(v.occurred_at) },
  { key: "plate", header: "Biển số", render: (v) => (
    <>{v.plate_number_captured} {v.unmatched && <span className="badge bad">Không khớp xe</span>}</>) },
  { key: "violation_type", header: "Lỗi" },
  { key: "location_name", header: "Camera" },
  { key: "liable_owner", header: "Người chịu phạt" },
  { key: "fine_amount", header: "Mức phạt", render: (v) => money(v.fine_amount) },
  { key: "status", header: "Trạng thái", render: (v) => (
    <>{<StatusBadge map={VIOLATION_STATUS} status={v.status} />} {v.is_overdue && <span className="badge bad">Quá hạn</span>}</>) },
];

// Giờ hiện tại theo dạng của <input type="datetime-local"> (giờ máy người dùng)
const nowLocal = () => { const d = new Date(); d.setSeconds(0, 0); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

function RecordDialog({ onClose }) {
  const toast = useToast();
  const nav = useNavigate();
  const types = useViolationTypes();
  const cameras = useCameras();
  const rec = useRecordViolation();
  const [f, setF] = useState({ plate_number: "", violation_type_id: "", camera_id: "", occurred_at: nowLocal() });
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: k === "plate_number" ? e.target.value.toUpperCase() : e.target.value }));
  const future = f.occurred_at && new Date(f.occurred_at) > new Date();
  const valid = f.plate_number.trim() && f.violation_type_id && f.camera_id && f.occurred_at && !future;

  const save = () => rec.mutate({
    plate_number: f.plate_number.trim(), violation_type_id: Number(f.violation_type_id),
    camera_id: Number(f.camera_id), occurred_at: new Date(f.occurred_at).toISOString(),
  }, {
    onSuccess: (r) => {
      toast.success(r.vehicle_id ? `Đã ghi nhận vi phạm #${r.violation_id}` : `Đã ghi nhận vi phạm #${r.violation_id}: biển số không khớp xe nào`);
      onClose();
      nav(`/enforcement/violations/${r.violation_id}`);
    },
    onError: (x) => toast.error(x),
  });

  return (
    <FormDialog title="Ghi nhận vi phạm từ camera" submitText="Ghi nhận" busy={rec.isPending} disabled={!valid} onSubmit={save} onCancel={onClose}>
      <p className="muted">Hệ thống tự đối chiếu biển số và xác định chủ xe tại thời điểm vi phạm theo lịch sử sở hữu.</p>
      <Field label="Biển số camera đọc được"><input autoFocus maxLength={15} value={f.plate_number} onChange={set("plate_number")} /></Field>
      <Field label="Lỗi vi phạm">
        <select value={f.violation_type_id} onChange={set("violation_type_id")}>
          <option value="">– Chọn lỗi –</option>
          {(types.data ?? []).map((t) => <option key={t.violation_type_id} value={t.violation_type_id}>{t.description} ({money(t.min_fine)} – {money(t.max_fine)})</option>)}
        </select>
      </Field>
      <Field label="Camera">
        <select value={f.camera_id} onChange={set("camera_id")}>
          <option value="">– Chọn camera –</option>
          {(cameras.data ?? []).map((c) => <option key={c.camera_id} value={c.camera_id}>{c.code} · {c.location_name}</option>)}
        </select>
      </Field>
      <Field label="Thời điểm vi phạm" error={future ? "Thời điểm không được ở tương lai" : undefined}>
        <input type="datetime-local" value={f.occurred_at} max={nowLocal()} onChange={set("occurred_at")} />
      </Field>
    </FormDialog>
  );
}

// Cán bộ xử lý vi phạm: hàng đợi vi phạm phạt nguội
export default function ViolationQueuePage() {
  const nav = useNavigate();
  const types = useViolationTypes();
  const cameras = useCameras();
  const list = useViolationQueue({ status: "recorded", sort: "oldest" });
  const [recording, setRecording] = useState(false);
  const p = list.params;
  const typeOptions = [{ value: "", label: "Tất cả" }, ...(types.data ?? []).map((t) => ({ value: String(t.violation_type_id), label: t.description }))];
  const camOptions = [{ value: "", label: "Tất cả" }, ...(cameras.data ?? []).map((c) => ({ value: String(c.camera_id), label: `${c.code} · ${c.location_name}` }))];
  return (
    <>
      <PageHeader title="Vi phạm phạt nguội" subtitle="Xác minh, lập quyết định xử phạt, hủy vi phạm sai."
        actions={<button className="btn" type="button" onClick={() => setRecording(true)}>Ghi nhận vi phạm</button>} />
      <StatusTabs tabs={TABS} value={p.status} onChange={(status) => list.setFilter({ status })} />
      <FilterBar>
        <SearchInput label="Biển số" placeholder="vd. 51K-567" value={p.plate} onChange={(plate) => list.setFilter({ plate })} />
        <SelectFilter label="Lỗi" value={p.violation_type_id} options={typeOptions} onChange={(violation_type_id) => list.setFilter({ violation_type_id })} />
        <SelectFilter label="Camera" value={p.camera_id} options={camOptions} onChange={(camera_id) => list.setFilter({ camera_id })} />
        <DateRange from={p.from_date} to={p.to_date} onChange={list.setFilter} />
        <SelectFilter label="Sắp xếp" value={p.sort} options={SORT} onChange={(sort) => list.setFilter({ sort })} />
        <label className="check"><input type="checkbox" checked={Boolean(p.unmatched)} onChange={(e) => list.setFilter({ unmatched: e.target.checked })} />Biển số không khớp xe</label>
        <label className="check"><input type="checkbox" checked={Boolean(p.overdue)} onChange={(e) => list.setFilter({ overdue: e.target.checked })} />Quá hạn nộp</label>
      </FilterBar>
      <PagedTable list={list} columns={COLUMNS} rowKey="violation_id" empty="Không có vi phạm nào khớp bộ lọc."
        onRowClick={(v) => nav(`/enforcement/violations/${v.violation_id}`)} />
      {recording && <RecordDialog onClose={() => setRecording(false)} />}
    </>
  );
}
