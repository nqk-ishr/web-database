import { api, call } from "./client";
import { db, wait } from "./mockData";
export const getMyViolations = () => call(() => api.get("/violations/mine"), () => wait(db.violations));
