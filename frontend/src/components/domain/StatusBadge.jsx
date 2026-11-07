export default function StatusBadge({ map, status, label }) {
  const s = map?.[status] ?? { label: status, tone: "info" };
  return <span className={`badge ${s.tone}`}>{label ?? s.label}</span>;
}
