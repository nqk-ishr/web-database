import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useMyRequests } from "../../hooks/useRequests";
import StatusBadge from "../../components/domain/StatusBadge";
import { PageHeader } from "../../components/ui/Field";
import { Empty, ErrorBox, Loading } from "../../components/feedback/State";
import { REQUEST_STATUS, REQUEST_TYPE } from "../../constants/status";
import { REQUEST_TABS, matchTab, myRole, vehicleLabel, waitingForMe } from "../../utils/requests";
import { dateTime } from "../../utils/format";

export default function MyRequestsPage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useMyRequests();
  const [tab, setTab] = useState("all");
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;

  const rows = data.filter(matchTab[tab]);
  const incoming = data.filter((r) => waitingForMe(r, user.user_id)).length;
  return (
    <>
      <PageHeader title="Hồ sơ của tôi" subtitle="Hồ sơ đăng ký xe và sang tên bạn đã gửi hoặc là bên mua."
        actions={<Link className="btn" to="/register-vehicle">Đăng ký xe mới</Link>} />
      {incoming > 0 && <div className="card alert"><p><b>{incoming} hồ sơ sang tên đang chờ bạn xác nhận</b> với tư cách bên mua.</p></div>}
      <div className="tabs">
        {REQUEST_TABS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} className={`tab${tab === t.key ? " on" : ""}`}
            onClick={() => setTab(t.key)}>{t.label} ({data.filter(matchTab[t.key]).length})</button>
        ))}
      </div>
      <section className="card table-scroll">
        {rows.length === 0 ? <Empty text="Không có hồ sơ nào trong mục này." /> : (
          <table>
            <caption className="sr-only">Danh sách hồ sơ</caption>
            <thead><tr><th>Loại</th><th>Xe</th><th>Vai trò của bạn</th><th>Trạng thái</th><th>Ngày gửi</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.request_id}>
                  <td><StatusBadge map={REQUEST_TYPE} status={r.request_type} /></td>
                  <td>{vehicleLabel(r)}</td>
                  <td>{myRole(r, user.user_id) === "buyer" ? `Bên mua (từ ${r.requester_name})` : r.request_type === "transfer" ? `Bên bán (cho ${r.buyer_name})` : "Người gửi"}</td>
                  <td><StatusBadge map={REQUEST_STATUS} status={r.status} />{waitingForMe(r, user.user_id) && <> <span className="badge warn">Chờ bạn xác nhận</span></>}</td>
                  <td>{dateTime(r.submitted_at)}</td>
                  <td><Link className="btn btn2 sm" to={`/requests/${r.request_id}`}>Chi tiết</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
