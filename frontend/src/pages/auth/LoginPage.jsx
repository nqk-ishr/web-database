import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { homePath } from "../../constants/roles";
import { Field } from "../../components/ui/Field";
import { errorMessage } from "../../utils/errors";

export default function LoginPage() {
  const { user, login } = useAuth();
  const loc = useLocation();
  const [f, setF] = useState({ username: loc.state?.username ?? "", password: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  // Đã đăng nhập (kể cả ngay sau khi submit thành công): về trang đang định vào, hoặc trang chủ của vai trò
  if (user) return <Navigate to={loc.state?.from?.pathname ?? homePath(user.role)} replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await login(f.username.trim(), f.password); }
    catch (x) { setErr(errorMessage(x)); setBusy(false); }
  };
  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h1>Đăng nhập</h1>
      {loc.state?.registered && <p className="card ok" role="status">Đăng ký thành công. Hãy đăng nhập bằng tài khoản vừa tạo.</p>}
      <form className="card" onSubmit={submit}>
        <Field label="Tên đăng nhập">
          <input required autoComplete="username" autoFocus value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} />
        </Field>
        <Field label="Mật khẩu">
          <input required type="password" autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>
        {err && <p role="alert" className="err">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      </form>
      <p className="muted">Chủ xe chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
    </main>
  );
}
