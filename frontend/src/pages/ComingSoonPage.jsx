import { useAuth } from "../auth/AuthContext";
import { ROLE_LABELS } from "../constants/roles";

export default function ComingSoonPage() {
  const { user } = useAuth();
  return (
    <section className="card">
      <h1>Đang xây dựng</h1>
      <p>Giao diện cho vai trò <b>{ROLE_LABELS[user?.role]}</b> sẽ được bổ sung ở các phần tiếp theo.
        API tương ứng của backend đã sẵn sàng.</p>
    </section>
  );
}
