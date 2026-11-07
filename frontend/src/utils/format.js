const TZ = "Asia/Ho_Chi_Minh";
export const money = (n) => (n == null ? "–" : new Intl.NumberFormat("vi-VN").format(n) + " đ");
export const dateTime = (s) => (s ? new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(s)) : "–");
export const date = (s) => (s ? new Intl.DateTimeFormat("vi-VN", { timeZone: TZ }).format(new Date(s)) : "–");
export const daysBetween = (from, to) => Math.floor((new Date(to) - new Date(from)) / 86400000);
