import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import * as authApi from "../../api/auth";
import { validateRegister } from "../../auth/validation";
import { homePath } from "../../constants/roles";
import { Field } from "../../components/ui/Field";
import { errorMessage } from "../../utils/errors";
import { clean } from "../../utils/params";

const EMPTY = { username: "", full_name: "", citizen_id: "", phone: "", email: "", password: "", confirm: "" };

// Tự đăng ký chỉ tạo tài khoản chủ xe. Tài khoản cán bộ do quản trị viên tạo.
export default function RegisterPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [serverErr, setServerErr] = useState(null);
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={homePath(user.role)} replace />;

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setServerErr(null);
    const v = validateRegister(f);
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const { confirm, ...body } = f;
      await authApi.register(clean({ ...body, username: body.username.trim(), full_name: body.full_name.trim() }));
      nav("/login", { replace: true, state: { registered: true, username: f.username.trim() } });
    } catch (x) { setServerErr(errorMessage(x)); setBusy(false); }     // vd. 409: tên đăng nhập/CCCD/email đã tồn tại
  };

  return (
    <main className="wrap" style={{ maxWidth: 520, paddingTop: 48 }}>
      <h1>Đăng ký tài khoản chủ xe</h1>
      <form className="card" onSubmit={submit} noValidate>
        <Field label="Tên đăng nhập" error={errs.username} hint="Chữ không dấu, số, . _ -"><input autoComplete="username" value={f.username} onChange={set("username")} /></Field>
        <Field label="Họ và tên" error={errs.full_name}><input autoComplete="name" value={f.full_name} onChange={set("full_name")} /></Field>
        <Field label="Số CCCD/CMND" error={errs.citizen_id} hint="9 đến 12 chữ số"><input inputMode="numeric" value={f.citizen_id} onChange={set("citizen_id")} /></Field>
        <Field label="Số điện thoại (không bắt buộc)" error={errs.phone}><input type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Email (không bắt buộc)" error={errs.email}><input type="email" autoComplete="email" value={f.email} onChange={set("email")} /></Field>
        <Field label="Mật khẩu" error={errs.password} hint="Tối thiểu 8 ký tự"><input type="password" autoComplete="new-password" value={f.password} onChange={set("password")} /></Field>
        <Field label="Nhập lại mật khẩu" error={errs.confirm}><input type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></Field>
        {serverErr && <p role="alert" className="err">{serverErr}</p>}
        <button className="btn" disabled={busy}>{busy ? "Đang đăng ký…" : "Đăng ký"}</button>
      </form>
      <p className="muted">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </main>
  );
}
