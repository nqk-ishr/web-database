import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { errorMessage } from "../../utils/errors";

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ username: "", password: "" });
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErr(null);
    try { await login(f.username, f.password); nav("/"); }
    catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <main className="wrap" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h1>Đăng nhập</h1>
      <form className="card" onSubmit={submit}>
        <label>Tên đăng nhập<input required value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
        <label>Mật khẩu<input required type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        {err && <p role="alert" className="err">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      </form>
    </main>
  );
}
