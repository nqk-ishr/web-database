import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useMyVehicles } from "../../hooks/useVehicles";
import { useBuyPolicy, useMyPolicies, useProducts } from "../../hooks/usePolicies";
import { Field, PageHeader } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { findOverlap, pendingFor, policyEnd, startDateError, suggestedStart } from "../../utils/policies";
import { errorMessage } from "../../utils/errors";
import { date, money, vnToday } from "../../utils/format";

export default function BuyPolicyPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const vehicles = useMyVehicles();
  const policies = useMyPolicies();
  const buy = useBuyPolicy();
  const [vehicleId, setVehicleId] = useState(params.get("vehicle_id") ?? "");
  const [productId, setProductId] = useState("");
  const [start, setStart] = useState(null);                // null = dùng ngày gợi ý
  const [serverErr, setServerErr] = useState(null);
  const eligible = useMemo(() => (vehicles.data ?? []).filter((v) => v.status === "normal"), [vehicles.data]);
  // Chỉ chấp nhận xe của tôi đang "Bình thường" (kể cả khi vehicle_id lấy từ đường dẫn do người dùng tự gõ)
  const vid = eligible.some((v) => String(v.vehicle_id) === String(vehicleId)) ? Number(vehicleId) : 0;
  const products = useProducts(vid || "");
  const today = vnToday();
  const product = (products.data ?? []).find((p) => String(p.product_id) === String(productId));
  const startDate = start ?? (vid ? suggestedStart(policies.data, vid, today) : today);
  const startErr = startDateError(startDate, today);
  const end = product && !startErr ? policyEnd(startDate, product.term_months) : null;     // chỉ tính khi ngày hợp lệ
  const pending = vid ? pendingFor(policies.data, vid) : null;
  const overlap = vid && end ? findOverlap(policies.data, vid, startDate, end) : null;
  const renewal = vid ? suggestedStart(policies.data, vid, today) !== today : false;

  if (vehicles.isLoading || policies.isLoading) return <Loading />;
  if (vehicles.error) return <ErrorBox error={vehicles.error} onRetry={vehicles.refetch} />;
  if (policies.error) return <ErrorBox error={policies.error} onRetry={policies.refetch} />;

  const submit = () => {
    setServerErr(null);
    buy.mutate({ vehicle_id: vid, product_id: product.product_id, start_date: startDate }, {
      onSuccess: (r) => { toast.success("Đã tạo hợp đồng. Hãy thanh toán phí để hợp đồng có hiệu lực."); nav(`/insurance/${r.policy_id}`, { replace: true }); },
      onError: (x) => setServerErr(errorMessage(x)),
    });
  };
  const canSubmit = product && !startErr && !pending && !overlap && !buy.isPending;

  return (
    <>
      <div><p className="muted"><Link to="/insurance">Bảo hiểm của tôi</Link> /</p>
        <PageHeader title="Mua hoặc gia hạn bảo hiểm" subtitle="Chọn xe, gói bảo hiểm và ngày bắt đầu." /></div>

      <section className="card" style={{ maxWidth: 640 }}>
        <h2>1. Chọn xe</h2>
        <Field label="Xe" hint="Chỉ xe ở trạng thái Bình thường mới mua được bảo hiểm">
          <select value={vid || ""} onChange={(e) => { setVehicleId(e.target.value); setProductId(""); setStart(null); setServerErr(null); }}>
            <option value="">Chọn xe…</option>
            {eligible.map((v) => <option key={v.vehicle_id} value={v.vehicle_id}>{v.plate_number} · {v.vehicle_type}</option>)}
          </select>
        </Field>
        {vehicleId && !vid && (
          <div className="card warn" role="alert">Xe này không mua được bảo hiểm: không phải xe của bạn hoặc không ở trạng thái Bình thường. Hãy chọn xe khác.</div>
        )}
        {pending && (
          <div className="card warn" role="status">Xe này đã có một hợp đồng đang chờ thanh toán. Hãy thanh toán hoặc hủy hợp đồng đó trước khi mua tiếp.
            {" "}<Link to={`/insurance/${pending.policy_id}`}>Xem hợp đồng</Link></div>
        )}
      </section>

      {vid > 0 && !pending && (
        <section className="card">
          <h2>2. Chọn gói bảo hiểm</h2>
          {products.isLoading ? <Loading /> : products.error ? <ErrorBox error={products.error} onRetry={products.refetch} />
            : products.data.length === 0 ? <p className="muted">Hiện chưa có gói bảo hiểm cho loại xe này.</p> : (
              <div className="grid">
                {products.data.map((p) => (
                  <label key={p.product_id} className={`choice${String(p.product_id) === String(productId) ? " on" : ""}`}>
                    <input type="radio" name="product" value={p.product_id} checked={String(p.product_id) === String(productId)}
                      onChange={() => { setProductId(p.product_id); setServerErr(null); }} />
                    <span className="muted">{p.insurer}</span>
                    <b>{p.name}</b>
                    <span>{money(p.premium)} / {p.term_months} tháng</span>
                    <span className="muted">Hạn mức {money(p.liability_limit)}</span>
                    {p.includes_theft ? <span className="badge ok">Có quyền lợi mất cắp</span> : <span className="badge info">Không có mất cắp</span>}
                  </label>
                ))}
              </div>
            )}
        </section>
      )}

      {product && !pending && (
        <section className="card" style={{ maxWidth: 640 }}>
          <h2>3. Ngày bắt đầu và xác nhận</h2>
          {renewal && start === null && <p className="muted">Xe đang có hợp đồng còn hiệu lực nên ngày bắt đầu được gợi ý là ngày liền sau khi hợp đồng đó hết hạn (gia hạn).</p>}
          <Field label="Ngày bắt đầu" error={startErr}>
            <input type="date" min={today} value={startDate} onChange={(e) => { setStart(e.target.value); setServerErr(null); }} />
          </Field>
          {overlap && (
            <div className="card bad" role="alert">Khoảng thời gian này chồng với hợp đồng hiện có (đến {date(overlap.end_date)}). Hãy chọn ngày bắt đầu từ {date(overlap.end_date)} trở về sau.
              {" "}<button className="btn btn2 sm" type="button" onClick={() => setStart(null)}>Dùng ngày gợi ý</button></div>
          )}
          <dl className="kv">
            <dt>Gói</dt><dd>{product.insurer} · {product.name}</dd>
            <dt>Hiệu lực dự kiến</dt><dd>{date(startDate)} – {end ? date(end) : "–"}</dd>
            <dt>Phí</dt><dd><b>{money(product.premium)}</b></dd>
          </dl>
          <p className="muted">Hợp đồng chỉ có hiệu lực sau khi bạn thanh toán phí. Phí, hạn mức và ngày hết hạn cuối cùng do hệ thống xác định khi tạo hợp đồng.</p>
          {serverErr && <p role="alert" className="err">{serverErr}</p>}
          <button className="btn" type="button" disabled={!canSubmit} onClick={submit}>{buy.isPending ? "Đang tạo…" : "Tạo hợp đồng"}</button>
        </section>
      )}
    </>
  );
}
