import { VEHICLE_EVENT } from "../../constants/status";
import { dateTime } from "../../utils/format";

// Lịch sử sự kiện của xe (GET /vehicles/{id}/history), mới nhất trước
export default function EventTimeline({ items }) {
  if (!items.length) return <p className="muted">Chưa có sự kiện nào.</p>;
  return (
    <div className="tl">
      {items.map((e) => (
        <div key={e.history_id}>
          <p><b>{VEHICLE_EVENT[e.event_type] ?? e.event_type}</b> <span className="muted">· {dateTime(e.changed_at)}</span></p>
          {e.reason && <p className="muted">{e.reason}</p>}
          {e.actor_name && <p className="muted">Thực hiện: {e.actor_name}</p>}
        </div>
      ))}
    </div>
  );
}
