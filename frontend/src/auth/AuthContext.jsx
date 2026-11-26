import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "../api/auth";
import { Loading } from "../components/feedback/State";
import { isKnownRole } from "../constants/roles";
import { statusOf } from "../utils/errors";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// Chỉ coi là đã đăng nhập khi còn token; user lưu kèm để hiển thị tên/vai trò ngay khi tải trang.
function readUser() {
  try {
    if (!localStorage.getItem("token")) return null;
    const u = JSON.parse(localStorage.getItem("user") || "null");
    return u && isKnownRole(u.role) ? u : null;
  } catch { return null; }
}
const pick = (u) => ({ user_id: u.user_id, username: u.username, full_name: u.full_name, role: u.role });

export function AuthProvider({ children }) {
  const qc = useQueryClient();
  const [user, setUser] = useState(readUser);
  const [checking, setChecking] = useState(() => readUser() !== null);   // có phiên cũ: xác thực lại với máy chủ

  const clear = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    qc.clear();                  // xóa cache để người đăng nhập sau không thấy dữ liệu của người trước
  }, [qc]);

  useEffect(() => {
    if (!checking) return undefined;
    let alive = true;
    authApi.me()
      .then((u) => {
        if (!alive) return;
        if (!u || !isKnownRole(u.role)) { clear(); return; }
        localStorage.setItem("user", JSON.stringify(pick(u)));          // đồng bộ nếu họ tên/vai trò đã đổi
        setUser(pick(u));
      })
      .catch((e) => { if (alive && [400, 401, 403].includes(statusOf(e))) clear(); })   // lỗi mạng: giữ phiên cũ
      .finally(() => { if (alive) setChecking(false); });
    return () => { alive = false; };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps -- chỉ chạy một lần khi tải trang

  const login = useCallback(async (username, password) => {
    const { access_token, user: u } = await authApi.login(username, password);
    if (!isKnownRole(u.role)) throw new Error("Vai trò tài khoản không được hỗ trợ");
    localStorage.setItem("token", access_token);
    localStorage.setItem("user", JSON.stringify(pick(u)));
    qc.clear();
    setUser(pick(u));
    return u;
  }, [qc]);

  const value = useMemo(() => ({ user, login, logout: clear }), [user, login, clear]);
  return (
    <AuthContext.Provider value={value}>
      {checking ? <main className="wrap"><Loading /></main> : children}
    </AuthContext.Provider>
  );
}
