import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMyPolicies } from "../../hooks/usePolicies";
import { useMyVehicles, useOwnership } from "../../hooks/useVehicles";
import { useMyClaims, useSubmitClaim } from "../../hooks/useClaims";
import { uploadAttachment } from "../../api/attachments";
import { Field, PageHeader } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { claimablePolicy, normalizeClaim, parseAmount, theftBlockReason, validateClaim, vnNowLocal } from "../../utils/claims";
import { ACCEPT, MAX_FILES, fileError, formatSize } from "../../utils/files";
import { errorMessage } from "../../utils/errors";
import { date, money } from "../../utils/format";

const EMPTY = { claim_type: "accident", event_time: "", event_location: "", description: "", requested_amount: "" };

export default function NewClaimPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const policies = useMyPolicies();
  const vehicles = useMyVehicles();
  const claims = useMyClaims();
  const submit = useSubmitClaim();
  const [policyId, setPolicyId] = useState(params.get("policy_id") ?? "");
  const [f, setF] = useState(EMPTY);
  const [files, setFiles] = useState([]);
  const [errs, setErrs] = useState({});
  const [fileErr, setFileErr] = useState(null);
  const [serverErr, setServerErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const eligible = (policies.data ?? []).filter(claimablePolicy);
  // Chỉ chấp nhận hợp đồng đang hiệu lực của tôi (kể cả khi policy_id lấy từ đường dẫn tự gõ)
  const policy = eligible.find((p) => String(p.policy_id) === String(policyId)) ?? null;
  const vehicle = policy ? (vehicles.data ?? []).find((v) => v.vehicle_id === policy.vehicle_id) : null;
  const ownership = useOwnership(policy?.vehicle_id ?? 0);
  const ownershipStart = ownership.data?.find((o) => o.valid_to === null)?.valid_from ?? null;
  const theftBlock = policy ? theftBlockReason(policy, vehicle, claims.data) : null;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  if (policies.isLoading || vehicles.isLoading || claims.isLoading) return <Loading />;
  if (policies.error) return <ErrorBox error={policies.error} onRetry={policies.refetch} />;
  if (vehicles.error) return <ErrorBox error={vehicles.error} onRetry={vehicles.refetch} />;
  if (claims.error) return <ErrorBox error={claims.error} onRetry={claims.refetch} />;

  const addFiles = (e) => {
    const next = [...files]; const problems = [];
    for (const file of Array.from(e.target.files ?? [])) {
      const err = fileError(file, next.length);
      if (err) problems.push(`${file.name}: ${err}`); else next.push(file);
    }
    e.target.value = "";
    setFiles(next); setFileErr(problems.length ? problems.join("; ") : null);
  };

  const onSubmit = async (e) => {
    e.preventDefault(); setServerErr(null);
    const v = validateClaim(f, { policy, ownershipStart, theftBlock });
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await submit.mutateAsync(normalizeClaim(f, policy.policy_id));
      const failed = [];
      for (const file of files) { try { await uploadAttachment("claims", r.claim_id, file); } catch { failed.push(file.name); } }
      if (failed.length) toast.error(`Yêu cầu đã gửi, nhưng ${failed.length} tệp chưa tải lên được (${failed.join(", ")}). Bạn có thể thêm lại ở trang yêu cầu.`);
      else toast.success("Đã gửi yêu cầu bồi thường. Công ty bảo hiểm sẽ thẩm định.");
      nav(`/claims/${r.claim_id}`, { replace: true });
    } catch (x) { setServerErr(errorMessage(x)); setBusy(false); }     // 409 từ trigger: ngoài hạn hợp đồng, không phải chủ xe lúc xảy ra...
  };

  const amount = parseAmount(f.requested_amount);
  return (
    <>
      <div><p className="muted"><Link to="/claims">Yêu cầu bồi thường</Link> /</p>
        <PageHeader title="Gửi yêu cầu bồi thường" subtitle="Chỉ hợp đồng đang có hiệu lực mới nhận được yêu cầu." /></div>

      {eligible.length === 0 ? (
        <div className="card warn" role="status">Bạn chưa có hợp đồng bảo hiểm nào đang hiệu lực. <Link to="/insurance/buy">Mua bảo hiểm</Link></div>
      ) : (
        <form className="card" style={{ maxWidth: 640 }} onSubmit={onSubmit} noValidate>
          <Field label="Hợp đồng bảo hiểm">
            <select value={policy?.policy_id ?? ""} onChange={(e) => { setPolicyId(e.target.value); setErrs({}); setServerErr(null); }}>
              <option value="">Chọn hợp đồng…</option>
              {eligible.map((p) => <option key={p.policy_id} value={p.policy_id}>{p.plate_number} · {p.product_name} · đến {date(p.end_date)}</option>)}
            </select>
          </Field>
          {policyId && !policy && <div className="card warn" role="alert">Hợp đồng này không nhận được yêu cầu: không phải hợp đồng của bạn hoặc đã hết hiệu lực. Hãy chọn hợp đồng khác.</div>}

          {policy && (
            <>
              <p className="muted">Hiệu lực {date(policy.start_date)} – {date(policy.end_date)} · Hạn mức {money(policy.liability_limit)}</p>
              <fieldset className="radios">
                <legend>Loại yêu cầu</legend>
                <label className="check"><input type="radio" name="claim_type" checked={f.claim_type === "accident"} onChange={() => setF({ ...f, claim_type: "accident" })} /> Tai nạn</label>
                <label className="check"><input type="radio" name="claim_type" disabled={!!theftBlock} checked={f.claim_type === "theft"} onChange={() => setF({ ...f, claim_type: "theft" })} /> Mất cắp</label>
                {theftBlock && <span className="muted">{theftBlock}</span>}
                {errs.claim_type && <span className="err" role="alert">{errs.claim_type}</span>}
              </fieldset>
              {f.claim_type === "theft" && <div className="card warn" role="status">Nếu yêu cầu mất cắp được duyệt, xe sẽ chuyển sang trạng thái <b>Báo mất</b>: các hồ sơ đăng ký/sang tên và hợp đồng chưa thanh toán của xe sẽ bị hủy.</div>}

              <Field label="Thời điểm xảy ra sự kiện (giờ Việt Nam)" error={errs.event_time}
                hint={ownershipStart ? `Bạn chỉ yêu cầu được cho sự kiện xảy ra từ khi đứng tên xe (${date(ownershipStart)}).` : undefined}>
                <input type="datetime-local" max={vnNowLocal()} value={f.event_time} onChange={set("event_time")} />
              </Field>
              <Field label="Địa điểm" error={errs.event_location}><input value={f.event_location} onChange={set("event_location")} maxLength={300} /></Field>
              <Field label="Mô tả sự việc (không bắt buộc)" error={errs.description}><textarea rows={4} maxLength={1000} value={f.description} onChange={set("description")} /></Field>
              <Field label="Số tiền đề nghị (đ)" error={errs.requested_amount}
                hint={Number.isInteger(amount) && amount > policy.liability_limit ? `Vượt hạn mức hợp đồng (${money(policy.liability_limit)}): số tiền được duyệt sẽ không vượt hạn mức.` : "Chỉ nhập chữ số, ví dụ 5000000"}>
                <input inputMode="numeric" value={f.requested_amount} onChange={set("requested_amount")} />
              </Field>

              <Field label="Giấy tờ, ảnh hiện trường (không bắt buộc)" error={fileErr}
                hint={`PDF, JPG hoặc PNG, tối đa 5 MB mỗi tệp, tối đa ${MAX_FILES} tệp. Có thể thêm sau ở trang yêu cầu.`}>
                <input type="file" multiple accept={ACCEPT} onChange={addFiles} />
              </Field>
              {files.length > 0 && (
                <ul className="files">
                  {files.map((file, i) => (
                    <li key={`${file.name}-${i}`}><span>{file.name} <span className="muted">· {formatSize(file.size)}</span></span>
                      <button className="btn btn2 sm" type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>Bỏ</button></li>
                  ))}
                </ul>
              )}
              {serverErr && <p role="alert" className="err">{serverErr}</p>}
              <button className="btn" disabled={busy}>{busy ? "Đang gửi…" : "Gửi yêu cầu"}</button>
            </>
          )}
        </form>
      )}
    </>
  );
}
