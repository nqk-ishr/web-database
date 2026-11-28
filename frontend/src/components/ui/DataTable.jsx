import { Empty } from "../feedback/State";

/**
 * columns: [{ key, header, render?: (row) => node }]
 * <DataTable columns={cols} rows={data.items} rowKey="request_id" onRowClick={(r) => nav(`/requests/${r.request_id}`)} />
 */
export default function DataTable({ columns, rows, rowKey, empty = "Không có dữ liệu.", onRowClick }) {
  if (!rows?.length) return <section className="card"><Empty text={empty} /></section>;
  return (
    <section className="card table-scroll">
      <table>
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.header}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[rowKey]} className={onRowClick ? "click" : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
              {columns.map((c) => <td key={c.key}>{c.render ? c.render(r) : r[c.key] ?? "–"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
