import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NAV } from "../constants/nav";
import { ROLE_LABELS } from "../constants/roles";

// Khung chung cho mọi vai trò: menu lấy từ constants/nav.js theo vai trò đang đăng nhập.
export default function AppLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }) => (isActive ? "on" : undefined);
  const items = (user && NAV[user.role]) || [];
  return (
    <>
      <a className="skip" href="#main">Bỏ qua điều hướng</a>
      <header className="top">
        <span className="logo">QLPT Online</span>
        <nav className="nav" aria-label="Điều hướng chính">
          {items.map((i) => <NavLink key={i.to} to={i.to} end={i.end} className={link}>{i.label}</NavLink>)}
        </nav>
        {user && (
          <>
            <span className="muted">{user.full_name} · {ROLE_LABELS[user.role]}</span>
            <NavLink className="btn btn2 sm" to="/account/password">Đổi mật khẩu</NavLink>
            <button className="btn btn2 sm" type="button" onClick={() => { logout(); nav("/login", { replace: true }); }}>Đăng xuất</button>
          </>
        )}
      </header>
      <main id="main" className="wrap"><Outlet /></main>
    </>
  );
}
