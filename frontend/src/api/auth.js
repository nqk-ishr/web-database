import { api, call } from "./client";
import { wait } from "./mockData";

// Chế độ mock: đăng nhập bằng tên "registrar", "violation_officer", "insurance_staff", "admin" để xem từng vai trò;
// tên khác = chủ xe.
const MOCK_ROLES = ["registrar", "violation_officer", "insurance_staff", "admin"];
const mockUser = (username) => {
  const role = MOCK_ROLES.includes(username) ? username : "owner";
  return { user_id: 1, username, full_name: role === "owner" ? "Nguyễn Văn An" : `Demo ${role}`, role };
};

export const login = (username, password) =>
  call(() => api.post("/auth/login", { username, password }),
       () => wait({ access_token: "mock-token", user: mockUser(username) }));

export const me = () =>
  call(() => api.get("/auth/me"), () => wait(JSON.parse(localStorage.getItem("user") || "null")));

// Backend: POST /auth/register -> 201 { user_id, username, full_name, role: "owner" } (không trả token)
export const register = (body) =>
  call(() => api.post("/auth/register", body),
       () => wait({ user_id: 99, username: body.username, full_name: body.full_name, role: "owner" }));

export const changePassword = (old_password, new_password) =>
  call(() => api.post("/auth/change-password", { old_password, new_password }), () => wait({ ok: true }));
