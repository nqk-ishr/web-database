import { date } from "../../utils/format";
export default function OwnershipTimeline({ items }) {
  return (
    <div className="tl">
      {items.map((o, i) => (
        <div key={i}>
          <p><b>{o.owner_name}</b> {!o.valid_to && <span className="badge info">Chủ hiện hành</span>}</p>
          <p className="muted">{date(o.valid_from)} – {o.valid_to ? date(o.valid_to) : "nay"}</p>
        </div>
      ))}
    </div>
  );
}
