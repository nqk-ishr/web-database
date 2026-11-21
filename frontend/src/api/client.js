import axios from "axios";

export const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
api.interceptors.response.use((r) => r, (err) => {
  if (err.response?.status === 401) { localStorage.removeItem("token"); window.location.assign("/login"); }
  return Promise.reject(err);
});

// call(() => api.get(...), () => mockValue): dùng mock khi VITE_USE_MOCK=true
export const call = (real, mock) => (USE_MOCK ? mock() : real().then((r) => r.data));
