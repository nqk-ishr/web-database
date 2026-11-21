import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function OwnerLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }) => (isActive ? "on" : undefined);
  return (
    <>
      <header className="top">
        <span className="logo">QLPT Online</span>
        <nav className="nav">
          <NavLink to="/" end className={link}>Trang chủ</NavLink>
          <NavLink to="/violations" className={link}>Vi phạm của tôi</NavLink>
          <a href="#" onClick={(e) => e.preventDefault()}>Bảo hiểm</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Hồ sơ của tôi</a>
        </nav>
        <span className="muted">{user?.full_name}</span>
        <button className="btn btn2" type="button" onClick={() => { logout(); nav("/login"); }}>Đăng xuất</button>
      </header>
      <main className="wrap"><Outlet /></main>
    </>
  );
}
