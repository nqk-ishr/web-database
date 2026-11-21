import { api, call } from "./client";
import { wait } from "./mockData";
export const login = (username, password) =>
  call(() => api.post("/auth/login", { username, password }),
       () => wait({ access_token: "mock-token", user: { user_id: 1, full_name: "Nguyễn Văn An", role: "owner" } }));
export const me = () => call(() => api.get("/auth/me"), () => wait({ user_id: 1, full_name: "Nguyễn Văn An", role: "owner" }));
