import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateUser, useInsurers, useUsers } from "../../hooks/useStaff";
import PagedTable from "../../components/staff/PagedTable";
import FormDialog from "../../components/staff/FormDialog";
import Modal from "../../components/ui/Modal";
import { Field, PageHeader } from "../../components/ui/Field";
import { FilterBar, SearchInput, SelectFilter } from "../../components/ui/Filters";
import { useToast } from "../../components/ui/Toast";
import { ROLE_LABELS, ROLES } from "../../constants/roles";
import { date } from "../../utils/format";

const ROLE_OPTIONS = [{ value: "", label: "Tất cả" }, ...Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))];
const ACTIVE_OPTIONS = [{ value: "", label: "Tất cả" }, { value: "true", label: "Đang hoạt động" }, { value: "false", label: "Đã khóa" }];

const COLUMNS = [
  { key: "username", header: "Tên đăng nhập", render: (u) => <b>{u.username}</b> },
  { key: "full_name", header: "Họ tên" },
  { key: "role", header: "Vai trò", render: (u) => ROLE_LABELS[u.role] ?? u.role },
  { key: "insurer", header: "Công ty BH" },
  { key: "email", header: "Email" },
  { key: "created_at", header: "Ngày tạo", render: (u) => date(u.created_at) },
  { key: "is_active", header: "Trạng thái", render: (u) => <span className={`badge ${u.is_active ? "ok" : "bad"}`}>{u.is_active ? "Hoạt động" : "Đã khóa"}</span> },
];

const USERNAME = /^[A-Za-z0-9._-]{3,50}$/;
const CITIZEN = /^[0-9]{9,12}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const EMPTY = { username: "", full_name: "", role: ROLES.REGISTRAR, insurer_id: "", citizen_id: "", phone: "", email: "", password: "" };

// Hiển thị mật khẩu tạm đúng một lần (backend không lưu bản rõ)
export function TempPasswordDialog({ username, password, onClose }) {
  return (
    <Modal open title="Mật khẩu tạm" onClose={onClose}
      footer={<button className="btn" type="button" onClick={onClose}>Đã ghi lại</button>}>
      <p>Mật khẩu tạm của <b>{username}</b> chỉ hiển thị một lần. Hãy gửi cho người dùng qua kênh an toàn và yêu cầu đổi ngay sau khi đăng nhập.</p>
      <p className="plate" style={{ userSelect: "all" }}>{password}</p>
    </Modal>
  );
}

function CreateUserDialog({ onClose, onCreated }) {
  const toast = useToast();
  const insurers = useInsurers();
  const create = useCreateUser();
  const [f, setF] = useState(EMPTY);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const isStaff = f.role === ROLES.INSURANCE_STAFF;
  const errs = {
    username: f.username && !USERNAME.test(f.username) ? "3–50 ký tự: chữ, số, dấu . _ -" : null,
    citizen_id: f.citizen_id && !CITIZEN.test(f.citizen_id) ? "9–12 chữ số" : null,
    email: f.email && !EMAIL.test(f.email) ? "Email không hợp lệ" : null,
    password: f.password && f.password.length < 8 ? "Tối thiểu 8 ký tự" : null,
  };
  const valid = USERNAME.test(f.username) && f.full_name.trim() && (!isStaff || f.insurer_id) && !Object.values(errs).some(Boolean);

  const save = () => {
    const body = { username: f.username.trim(), full_name: f.full_name.trim(), role: f.role };
    if (isStaff) body.insurer_id = Number(f.insurer_id);
    ["citizen_id", "phone", "email", "password"].forEach((k) => { if (f[k].trim()) body[k] = f[k].trim(); });
    create.mutate(body, {
      onSuccess: (u) => { toast.success(`Đã tạo tài khoản ${u.username}`); onCreated(u); },
      onError: (x) => toast.error(x),
    });
  };

  return (
    <FormDialog title="Tạo tài khoản" submitText="Tạo" busy={create.isPending} disabled={!valid} onSubmit={save} onCancel={onClose}>
      <Field label="Vai trò">
        <select value={f.role} onChange={(e) => setF((x) => ({ ...x, role: e.target.value, insurer_id: "" }))}>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </Field>
      {isStaff && (
        <Field label="Công ty bảo hiểm" error={!f.insurer_id ? "Bắt buộc với nhân viên bảo hiểm" : null}>
          <select value={f.insurer_id} onChange={set("insurer_id")}>
            <option value="">– Chọn công ty –</option>
            {(insurers.data ?? []).filter((i) => i.is_active).map((i) => <option key={i.insurer_id} value={i.insurer_id}>{i.name}</option>)}
          </select>
        </Field>
      )}
      <Field label="Tên đăng nhập" error={errs.username}><input autoFocus maxLength={50} value={f.username} onChange={set("username")} /></Field>
      <Field label="Họ tên"><input maxLength={150} value={f.full_name} onChange={set("full_name")} /></Field>
      <Field label="CCCD (không bắt buộc)" error={errs.citizen_id}><input inputMode="numeric" maxLength={12} value={f.citizen_id} onChange={set("citizen_id")} /></Field>
      <Field label="Điện thoại (không bắt buộc)"><input maxLength={20} value={f.phone} onChange={set("phone")} /></Field>
      <Field label="Email (không bắt buộc)" error={errs.email}><input type="email" maxLength={150} value={f.email} onChange={set("email")} /></Field>
      <Field label="Mật khẩu" error={errs.password} hint="Bỏ trống để hệ thống sinh mật khẩu tạm.">
        <input type="password" autoComplete="new-password" maxLength={72} value={f.password} onChange={set("password")} />
      </Field>
    </FormDialog>
  );
}

// Quản trị: danh sách và tạo tài khoản
export default function UsersPage() {
  const nav = useNavigate();
  const list = useUsers({});
  const [creating, setCreating] = useState(false);
  const [temp, setTemp] = useState(null);          // { username, password }
  const p = list.params;
  return (
    <>
      <PageHeader title="Tài khoản" subtitle="Tạo tài khoản cán bộ, nhân viên bảo hiểm; khóa, mở khóa và đặt lại mật khẩu."
        actions={<button className="btn" type="button" onClick={() => setCreating(true)}>Tạo tài khoản</button>} />
      <FilterBar>
        <SearchInput label="Tìm kiếm" placeholder="Tên đăng nhập, họ tên, CCCD, email…" value={p.q} onChange={(q) => list.setFilter({ q })} />
        <SelectFilter label="Vai trò" value={p.role} options={ROLE_OPTIONS} onChange={(role) => list.setFilter({ role })} />
        <SelectFilter label="Trạng thái" value={p.is_active} options={ACTIVE_OPTIONS} onChange={(is_active) => list.setFilter({ is_active })} />
      </FilterBar>
      <PagedTable list={list} columns={COLUMNS} rowKey="user_id" empty="Không có tài khoản nào." onRowClick={(u) => nav(`/admin/users/${u.user_id}`)} />
      {creating && (
        <CreateUserDialog onClose={() => setCreating(false)}
          onCreated={(u) => { setCreating(false); if (u.temporary_password) setTemp({ username: u.username, password: u.temporary_password }); }} />
      )}
      {temp && <TempPasswordDialog {...temp} onClose={() => setTemp(null)} />}
    </>
  );
}
