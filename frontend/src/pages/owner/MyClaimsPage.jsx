import { useState } from "react";
import { Link } from "react-router-dom";
import { useMyClaims } from "../../hooks/useClaims";
import StatusBadge from "../../components/domain/StatusBadge";
import { PageHeader } from "../../components/ui/Field";
import { Empty, ErrorBox, Loading } from "../../components/feedback/State";
import { CLAIM_STATUS, CLAIM_TYPE } from "../../constants/status";
import { CLAIM_TABS, matchClaimTab } from "../../utils/claims";
import { dateTime, money } from "../../utils/format";

export default function MyClaimsPage() {
  const { data, isLoading, error, refetch } = useMyClaims();
  const [tab, setTab] = useState("all");
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;

  const rows = data.filter(matchClaimTab[tab]);
  const needInfo = data.filter((c) => c.canSupplement).length;
  return (
    <>
      <PageHeader title="Yêu cầu bồi thường" subtitle="Yêu cầu bồi thường tai nạn hoặc mất cắp theo hợp đồng bảo hiểm của bạn."
        actions={<Link className="btn" to="/claims/new">Gửi yêu cầu bồi thường</Link>} />
      {needInfo > 0 && <div className="card alert"><p><b>{needInfo} yêu cầu cần bạn bổ sung thông tin.</b> Công ty bảo hiểm chưa thể thẩm định tiếp cho đến khi bạn gửi bổ sung.</p></div>}
      <div className="tabs">
        {CLAIM_TABS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} className={`tab${tab === t.key ? " on" : ""}`}
            onClick={() => setTab(t.key)}>{t.label} ({data.filter(matchClaimTab[t.key]).length})</button>
        ))}
      </div>
      <section className="card table-scroll">
        {rows.length === 0 ? <Empty text="Không có yêu cầu nào trong mục này." /> : (
          <table>
            <caption className="sr-only">Danh sách yêu cầu bồi thường</caption>
            <thead><tr><th>Xe</th><th>Loại</th><th>Sự kiện</th><th>Đề nghị</th><th>Được duyệt</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.claim_id}>
                  <td>{c.plate_number}<br /><span className="muted">{c.insurer}</span></td>
                  <td><StatusBadge map={CLAIM_TYPE} status={c.claim_type} /></td>
                  <td>{dateTime(c.event_time)}<br /><span className="muted">{c.event_location}</span></td>
                  <td>{money(c.requested_amount)}</td>
                  <td>{c.approved_amount == null ? "–" : money(c.approved_amount)}</td>
                  <td><StatusBadge map={CLAIM_STATUS} status={c.status} /></td>
                  <td><Link className="btn btn2 sm" to={`/claims/${c.claim_id}`}>{c.canSupplement ? "Bổ sung" : "Chi tiết"}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
