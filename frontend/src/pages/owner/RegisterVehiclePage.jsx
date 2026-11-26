import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSubmitRegistration, useVehicleTypes } from "../../hooks/useRequests";
import { uploadAttachment } from "../../api/attachments";
import { Field, PageHeader } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { normalizeRegistration, validateRegistration, vehicleTypeLabel } from "../../utils/requests";
import { ACCEPT, MAX_FILES, fileError, formatSize } from "../../utils/files";
import { errorMessage } from "../../utils/errors";

const EMPTY = { vehicle_type_id: "", chassis_number: "", engine_number: "", manufacture_year: "" };

export default function RegisterVehiclePage() {
  const nav = useNavigate();
  const toast = useToast();
  const types = useVehicleTypes();
  const submit = useSubmitRegistration();
  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [errs, setErrs] = useState({});
  const [fileErr, setFileErr] = useState(null);
  const [serverErr, setServerErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const addFiles = (e) => {
    const next = [...files];
    const problems = [];
    for (const file of Array.from(e.target.files ?? [])) {
      const err = fileError(file, next.length);
      if (err) problems.push(`${file.name}: ${err}`); else next.push(file);
    }
    e.target.value = "";
    setFiles(next);
    setFileErr(problems.length ? problems.join("; ") : null);
  };

  const onSubmit = async (e) => {
    e.preventDefault(); setServerErr(null);
    const v = validateRegistration(f);
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await submit.mutateAsync(normalizeRegistration(f));
      // Hồ sơ đã tạo; tệp tải lên lần lượt, tệp nào lỗi thì báo và cho thêm lại ở trang hồ sơ
      const failed = [];
      for (const file of files) {
        try { await uploadAttachment("requests", r.request_id, file); } catch { failed.push(file.name); }
      }
      if (failed.length) toast.error(`Hồ sơ đã gửi, nhưng ${failed.length} tệp chưa tải lên được (${failed.join(", ")}). Bạn có thể thêm lại ở trang hồ sơ.`);
      else toast.success("Đã gửi hồ sơ đăng ký. Cán bộ sẽ xem xét và cấp biển số.");
      nav(`/requests/${r.request_id}`, { replace: true });
    } catch (x) { setServerErr(errorMessage(x)); setBusy(false); }      // vd. 409: số khung/số máy đã tồn tại
  };

  if (types.isLoading) return <Loading />;
  if (types.error) return <ErrorBox error={types.error} onRetry={types.refetch} />;

  return (
    <>
      <div><p className="muted"><Link to="/">Xe của tôi</Link> /</p>
        <PageHeader title="Đăng ký xe mới" subtitle="Khai báo thông tin xe. Biển số sẽ được cán bộ cấp sau khi duyệt hồ sơ." /></div>
      <form className="card" style={{ maxWidth: 560 }} onSubmit={onSubmit} noValidate>
        <Field label="Loại xe" error={errs.vehicle_type_id}>
          <select value={f.vehicle_type_id} onChange={set("vehicle_type_id")}>
            <option value="">Chọn loại xe…</option>
            {types.data.map((t) => <option key={t.vehicle_type_id} value={t.vehicle_type_id}>{vehicleTypeLabel(t)}</option>)}
          </select>
        </Field>
        <Field label="Số khung" error={errs.chassis_number} hint="In hoa tự động, tối đa 30 ký tự"><input value={f.chassis_number} onChange={set("chassis_number")} /></Field>
        <Field label="Số máy" error={errs.engine_number} hint="In hoa tự động, tối đa 30 ký tự"><input value={f.engine_number} onChange={set("engine_number")} /></Field>
        <Field label="Năm sản xuất" error={errs.manufacture_year}><input inputMode="numeric" value={f.manufacture_year} onChange={set("manufacture_year")} /></Field>

        <Field label="Giấy tờ đính kèm (không bắt buộc)" error={fileErr}
          hint={`PDF, JPG hoặc PNG, tối đa 5 MB mỗi tệp, tối đa ${MAX_FILES} tệp. Có thể thêm sau ở trang hồ sơ.`}>
          <input type="file" multiple accept={ACCEPT} onChange={addFiles} />
        </Field>
        {files.length > 0 && (
          <ul className="files">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`}>
                <span>{file.name} <span className="muted">· {formatSize(file.size)}</span></span>
                <button className="btn btn2 sm" type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>Bỏ</button>
              </li>
            ))}
          </ul>
        )}

        {serverErr && <p role="alert" className="err">{serverErr}</p>}
        <button className="btn" disabled={busy}>{busy ? "Đang gửi hồ sơ…" : "Gửi hồ sơ"}</button>
      </form>
    </>
  );
}
