import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useVehicle } from "../../hooks/useVehicles";
import { useLookupBuyer, useMyRequests, useSubmitTransfer } from "../../hooks/useRequests";
import { Field, PageHeader } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { openRequestFor, transferBlockReason, validateCitizenId } from "../../utils/requests";
import { errorMessage } from "../../utils/errors";

export default function TransferPage() {
  const { vehicleId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const vehicle = useVehicle(vehicleId);
  const requests = useMyRequests();
  const lookup = useLookupBuyer();
  const submit = useSubmitTransfer();
  const [cccd, setCccd] = useState("");
  const [cccdErr, setCccdErr] = useState(null);
  const [buyer, setBuyer] = useState(null);          // { user_id, full_name } sau khi tra cứu thành công
  const [agree, setAgree] = useState(false);
  const [serverErr, setServerErr] = useState(null);

  if (vehicle.isLoading || requests.isLoading) return <Loading />;
  if (vehicle.error || !vehicle.data) return <ErrorBox error={vehicle.error ?? new Error("Không tìm thấy xe")} onRetry={vehicle.refetch} />;
  if (requests.error) return <ErrorBox error={requests.error} onRetry={requests.refetch} />;

  const v = vehicle.data;
  const open = openRequestFor(requests.data, v.vehicle_id);
  const blocked = transferBlockReason(v) ?? (open ? "Xe đang có một hồ sơ khác chưa xử lý xong." : null);

  const doLookup = (e) => {
    e.preventDefault(); setServerErr(null); setBuyer(null); setAgree(false);
    const err = validateCitizenId(cccd);
    setCccdErr(err);
    if (err) return;
    lookup.mutate(cccd.trim(), { onSuccess: setBuyer, onError: (x) => setCccdErr(errorMessage(x)) });
  };
  const doSubmit = () => {
    setServerErr(null);
    submit.mutate({ vehicle_id: v.vehicle_id, buyer_id: buyer.user_id }, {
      onSuccess: (r) => { toast.success("Đã gửi hồ sơ sang tên. Chờ bên mua xác nhận."); nav(`/requests/${r.request_id}`, { replace: true }); },
      onError: (x) => setServerErr(errorMessage(x)),      // backend kiểm tra lại: nợ phạt, trạng thái xe, hồ sơ mở...
    });
  };

  return (
    <>
      <div><p className="muted"><Link to="/">Xe của tôi</Link> / <Link to={`/vehicles/${v.vehicle_id}`}>{v.plate_number}</Link> /</p>
        <PageHeader title="Sang tên xe" subtitle={`Chuyển quyền sở hữu xe ${v.plate_number} cho người khác.`} /></div>

      {blocked ? (
        <div className="card bad" role="alert"><b>Chưa thể sang tên.</b> {blocked}
          {open && <p><Link to={`/requests/${open.request_id}`}>Xem hồ sơ đang xử lý</Link></p>}
          {v.blocking_violations > 0 && <p><Link to={`/violations?vehicle_id=${v.vehicle_id}`}>Xem vi phạm của xe</Link></p>}</div>
      ) : (
        <>
          <section className="card"><h2>Quy trình</h2>
            <ol className="plain">
              <li>Bạn nhập số CCCD của người nhận và gửi hồ sơ.</li>
              <li>Người nhận đăng nhập và xác nhận (hoặc từ chối) hồ sơ.</li>
              <li>Cán bộ đăng ký duyệt. Sau khi duyệt, quyền sở hữu chuyển cho người nhận và xe không còn trong danh sách của bạn.</li>
            </ol>
          </section>

          <form className="card" style={{ maxWidth: 560 }} onSubmit={doLookup} noValidate>
            <h2>1. Tìm người nhận</h2>
            <Field label="Số CCCD/CMND của người nhận" error={cccdErr} hint="Người nhận phải có tài khoản chủ xe trong hệ thống">
              <input inputMode="numeric" value={cccd} onChange={(e) => { setCccd(e.target.value); setBuyer(null); setAgree(false); }} />
            </Field>
            <button className="btn btn2" disabled={lookup.isPending}>{lookup.isPending ? "Đang tìm…" : "Tìm người nhận"}</button>
          </form>

          {buyer && (
            <section className="card" style={{ maxWidth: 560 }}>
              <h2>2. Xác nhận chuyển nhượng</h2>
              <p>Người nhận: <b>{buyer.full_name}</b></p>
              <p className="muted">Hãy kiểm tra kỹ tên người nhận trước khi gửi.</p>
              <label className="check"><input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                Tôi xác nhận chuyển nhượng xe {v.plate_number} cho {buyer.full_name}. Sau khi cán bộ duyệt, tôi không còn là chủ xe.</label>
              {serverErr && <p role="alert" className="err">{serverErr}</p>}
              <button className="btn" type="button" disabled={!agree || submit.isPending} onClick={doSubmit}>
                {submit.isPending ? "Đang gửi…" : "Gửi hồ sơ sang tên"}</button>
            </section>
          )}
        </>
      )}
    </>
  );
}
