import { useState } from "react";
import { Link } from "react-router-dom";
import { useMyPolicies } from "../../hooks/usePolicies";
import PolicyBadge from "../../components/domain/PolicyBadge";
import PayPolicyDialog from "../../components/domain/PayPolicyDialog";
import { PageHeader } from "../../components/ui/Field";
import { Empty, ErrorBox, Loading } from "../../components/feedback/State";
import { POLICY_TABS, matchPolicyTab } from "../../utils/policies";
import { date, money } from "../../utils/format";

export default function MyPoliciesPage() {
  const { data, isLoading, error, refetch } = useMyPolicies();
  const [tab, setTab] = useState("all");
  const [paying, setPaying] = useState(null);
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;

  const rows = data.filter(matchPolicyTab[tab]);
  const pending = data.filter((p) => p.canPay).length;
  return (
    <>
      <PageHeader title="Bảo hiểm của tôi" subtitle="Bảo hiểm trách nhiệm dân sự bắt buộc của các xe bạn đứng tên."
        actions={<Link className="btn" to="/insurance/buy">Mua bảo hiểm</Link>} />
      {pending > 0 && <div className="card alert"><p><b>{pending} hợp đồng đang chờ thanh toán.</b> Hợp đồng chỉ có hiệu lực sau khi thanh toán phí.</p></div>}
      <div className="tabs">
        {POLICY_TABS.map((t) => (
          <button key={t.key} type="button" aria-pressed={tab === t.key} className={`tab${tab === t.key ? " on" : ""}`}
            onClick={() => setTab(t.key)}>{t.label} ({data.filter(matchPolicyTab[t.key]).length})</button>
        ))}
      </div>
      <section className="card table-scroll">
        {rows.length === 0 ? <Empty text="Không có hợp đồng nào trong mục này." /> : (
          <table>
            <caption className="sr-only">Danh sách hợp đồng bảo hiểm</caption>
            <thead><tr><th>Xe</th><th>Gói bảo hiểm</th><th>Thời hạn</th><th>Phí</th><th>Trạng thái</th><th><span className="sr-only">Thao tác</span></th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.policy_id}>
                  <td>{p.plate_number}</td>
                  <td>{p.product_name}<br /><span className="muted">{p.insurer}</span></td>
                  <td>{date(p.start_date)} – {date(p.end_date)}</td>
                  <td>{money(p.premium)}</td>
                  <td><PolicyBadge p={p} /></td>
                  <td><div className="row" style={{ gap: 8, justifyContent: "flex-start" }}>
                    {p.canPay && <button className="btn sm" type="button" onClick={() => setPaying(p)}>Thanh toán</button>}
                    <Link className="btn btn2 sm" to={`/insurance/${p.policy_id}`}>Chi tiết</Link>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {paying && <PayPolicyDialog policy={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
