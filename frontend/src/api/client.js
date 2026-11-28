import axios from "axios";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  // 401 = token hết hạn / tài khoản bị khóa. Riêng đăng nhập sai backend trả 400 nên không đi vào đây.
  const isLogin = err.config?.url?.includes("/auth/login");
  if (err.response?.status === 401 && !isLogin) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");          // xóa cả user, nếu không giao diện tưởng vẫn đang đăng nhập
    if (window.location.pathname !== "/login") window.location.assign("/login");
  }
  return Promise.reject(err);
});

// call(() => api.get(...), () => mockValue): dùng mock khi VITE_USE_MOCK=true
export const call = (real, mock) => (USE_MOCK ? mock() : real().then((r) => r.data));
