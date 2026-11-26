import { useState } from "react";
import * as authApi from "../../api/auth";
import { validatePasswordChange } from "../../auth/validation";
import { Field, PageHeader } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { errorMessage } from "../../utils/errors";

const EMPTY = { old_password: "", new_password: "", confirm: "" };

export default function ChangePasswordPage() {
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [errs, setErrs] = useState({});
  const [serverErr, setServerErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setServerErr(null);
    const v = validatePasswordChange(f);
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      await authApi.changePassword(f.old_password, f.new_password);
      toast.success("Đã đổi mật khẩu");
      setF(EMPTY);
    } catch (x) { setServerErr(errorMessage(x)); }      // vd. "Mật khẩu hiện tại không đúng"
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHeader title="Đổi mật khẩu" subtitle="Dùng cho mọi vai trò" />
      <form className="card" style={{ maxWidth: 480 }} onSubmit={submit} noValidate>
        <Field label="Mật khẩu hiện tại" error={errs.old_password}><input type="password" autoComplete="current-password" value={f.old_password} onChange={set("old_password")} /></Field>
        <Field label="Mật khẩu mới" error={errs.new_password} hint="Tối thiểu 8 ký tự"><input type="password" autoComplete="new-password" value={f.new_password} onChange={set("new_password")} /></Field>
        <Field label="Nhập lại mật khẩu mới" error={errs.confirm}><input type="password" autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></Field>
        {serverErr && <p role="alert" className="err">{serverErr}</p>}
        <button className="btn" disabled={busy}>{busy ? "Đang lưu…" : "Đổi mật khẩu"}</button>
      </form>
    </>
  );
}
