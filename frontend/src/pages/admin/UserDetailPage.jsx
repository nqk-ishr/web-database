import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useInsurers, useResetPassword, useSetUserActive, useUpdateUser, useUser } from "../../hooks/useStaff";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { Field } from "../../components/ui/Field";
import { useToast } from "../../components/ui/Toast";
import { ErrorBox, Loading } from "../../components/feedback/State";
import { ROLE_LABELS, ROLES } from "../../constants/roles";
import { dateTime } from "../../utils/format";
import { TempPasswordDialog } from "./UsersPage";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Quản trị: sửa thông tin, khóa/mở khóa, đặt lại mật khẩu. Không đổi được vai trò hay tên đăng nhập (backend chặn).
export default function UserDetailPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const toast = useToast();
  const { data: u, isLoading, error, refetch } = useUser(id);
  const insurers = useInsurers();
  const update = useUpdateUser();
  const setActive = useSetUserActive();
  const reset = useResetPassword();
  const [f, setF] = useState(null);
  const [dialog, setDialog] = useState(null);       // "lock" | "unlock" | "reset"
  const [temp, setTemp] = useState(null);
  useEffect(() => { if (u) setF({ full_name: u.full_name ?? "", phone: u.phone ?? "", email: u.email ?? "", insurer_id: u.insurer_id ?? "" }); }, [u]);
  if (isLoading || (u && !f)) return <Loading />;
  if (error || !u) return <ErrorBox error={error ?? new Error("Không tìm thấy tài khoản")} onRetry={refetch} />;

  const isStaff = u.role === ROLES.INSURANCE_STAFF;
  const self = me.user_id === u.user_id;
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const emailErr = f.email && !EMAIL.test(f.email) ? "Email không hợp lệ" : null;
  const changes = {};
  if (f.full_name.trim() !== (u.full_name ?? "")) changes.full_name = f.full_name.trim();
  if (f.phone.trim() !== (u.phone ?? "")) changes.phone = f.phone.trim() || null;
  if (f.email.trim() !== (u.email ?? "")) changes.email = f.email.trim() || null;
  if (isStaff && String(f.insurer_id) !== String(u.insurer_id ?? "")) changes.insurer_id = Number(f.insurer_id);
  const dirty = Object.keys(changes).length > 0;
  const valid = f.full_name.trim() && !emailErr && (!isStaff || f.insurer_id);

  const close = () => setDialog(null);
  const save = (e) => {
    e.preventDefault();
    update.mutate({ id: u.user_id, ...changes }, { onSuccess: () => toast.success("Đã lưu thay đổi"), onError: (x) => toast.error(x) });
  };
  const toggle = (active) => setActive.mutate({ id: u.user_id, active }, {
    onSuccess: () => { toast.success(active ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản"); close(); },
    onError: (x) => { toast.error(x); close(); },
  });
  const doReset = () => reset.mutate(u.user_id, {
    onSuccess: (r) => { close(); setTemp({ username: u.username, password: r.temporary_password }); },
    onError: (x) => { toast.error(x); close(); },
  });

  return (
    <>
      <div><p className="muted"><Link to="/admin/users">Tài khoản</Link> /</p>
        <h1>{u.username} <span className={`badge ${u.is_active ? "ok" : "bad"}`}>{u.is_active ? "Hoạt động" : "Đã khóa"}</span></h1></div>
      <div className="grid">
        <section className="card"><h2>Thông tin cố định</h2>
          <dl className="kv">
            <dt>Vai trò</dt><dd>{ROLE_LABELS[u.role] ?? u.role}</dd>
            <dt>CCCD</dt><dd>{u.citizen_id ?? "–"}</dd>
            <dt>Ngày tạo</dt><dd>{dateTime(u.created_at)}</dd>
          </dl>
        </section>
        <form className="card" onSubmit={save} noValidate><h2>Sửa thông tin</h2>
          <Field label="Họ tên" error={!f.full_name.trim() ? "Không được để trống" : null}><input maxLength={150} value={f.full_name} onChange={set("full_name")} /></Field>
          <Field label="Điện thoại"><input maxLength={20} value={f.phone} onChange={set("phone")} /></Field>
          <Field label="Email" error={emailErr}><input type="email" maxLength={150} value={f.email} onChange={set("email")} /></Field>
          {isStaff && (
            <Field label="Công ty bảo hiểm">
              <select value={f.insurer_id} onChange={set("insurer_id")}>
                {(insurers.data ?? []).map((i) => <option key={i.insurer_id} value={i.insurer_id} disabled={!i.is_active}>{i.name}</option>)}
              </select>
            </Field>
          )}
          <button className="btn" type="submit" disabled={!dirty || !valid || update.isPending}>{update.isPending ? "Đang lưu…" : "Lưu thay đổi"}</button>
        </form>
        <section className="card"><h2>Bảo mật</h2>
          {u.is_active
            ? <button className="btn btn2" type="button" disabled={self} onClick={() => setDialog("lock")}>Khóa tài khoản</button>
            : <button className="btn" type="button" onClick={() => setDialog("unlock")}>Mở khóa</button>}
          {self && <p className="muted">Không thể tự khóa tài khoản của chính mình.</p>}
          <button className="btn btn2" type="button" onClick={() => setDialog("reset")}>Đặt lại mật khẩu</button>
        </section>
      </div>

      {dialog === "lock" && (
        <ConfirmDialog open title="Khóa tài khoản" danger confirmText="Khóa" busy={setActive.isPending}
          message={`${u.username} sẽ không gọi được API nào kể từ yêu cầu tiếp theo.`} onCancel={close} onConfirm={() => toggle(false)} />
      )}
      {dialog === "unlock" && (
        <ConfirmDialog open title="Mở khóa tài khoản" confirmText="Mở khóa" busy={setActive.isPending}
          message={`${u.username} đăng nhập lại được.`} onCancel={close} onConfirm={() => toggle(true)} />
      )}
      {dialog === "reset" && (
        <ConfirmDialog open title="Đặt lại mật khẩu" confirmText="Đặt lại" busy={reset.isPending}
          message="Hệ thống sinh mật khẩu tạm mới và hiển thị một lần. Phiên đăng nhập hiện có vẫn dùng được tới khi token hết hạn; muốn chặn ngay hãy khóa tài khoản."
          onCancel={close} onConfirm={doReset} />
      )}
      {temp && <TempPasswordDialog {...temp} onClose={() => setTemp(null)} />}
    </>
  );
}
