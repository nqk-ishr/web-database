// Bảng số liệu báo cáo; cột có `bar` vẽ thêm thanh tỷ lệ so với giá trị lớn nhất của cột đó.
//   <ReportTable title="Theo tháng" rows={rows} rowKey="month"
//                columns={[{ key: "month", header: "Tháng" }, { key: "total", header: "Tổng", format: money, bar: true }]} />
export default function ReportTable({ title, note, rows, columns, rowKey, empty = "Chưa có số liệu." }) {
  const max = Object.fromEntries(columns.filter((c) => c.bar).map((c) => [c.key, Math.max(0, ...rows.map((r) => Number(r[c.key]) || 0))]));
  return (
    <section className="card table-scroll">
      <h2>{title}</h2>
      {note && <p className="muted">{note}</p>}
      {rows.length === 0 ? <p className="muted">{empty}</p> : (
        <table className="report">
          <thead><tr>{columns.map((c) => <th key={c.key} className={c.num ? "num" : undefined}>{c.header}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={rowKey ? r[rowKey] : i}>
                {columns.map((c) => {
                  const val = c.format ? c.format(r[c.key], r) : r[c.key] ?? "–";
                  if (!c.bar) return <td key={c.key} className={c.num ? "num" : undefined}>{val}</td>;
                  const pct = max[c.key] ? (Number(r[c.key]) / max[c.key]) * 100 : 0;
                  return (
                    <td key={c.key} className="num">
                      <span className="bar-cell"><span className="bar" style={{ width: `${pct}%` }} aria-hidden="true" />{val}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
