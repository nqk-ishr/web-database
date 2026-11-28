const TZ = "Asia/Ho_Chi_Minh";
export const money = (n) => (n == null ? "–" : new Intl.NumberFormat("vi-VN").format(n) + " đ");
// Chuỗi rỗng hoặc sai định dạng => "–" (Intl ném lỗi với Invalid Date, sẽ làm trắng cả trang)
const fmtWith = (f) => (s) => {
  if (!s) return "–";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "–" : f.format(d);
};
export const dateTime = fmtWith(new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }));
export const date = fmtWith(new Intl.DateTimeFormat("vi-VN", { timeZone: TZ }));

// Ngày (không giờ) theo giờ Việt Nam, dạng "YYYY-MM-DD". Backend cũng tính "hôm nay" theo giờ Việt Nam.
export const vnToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
const dayNum = (s) => { const [y, m, d] = String(s).slice(0, 10).split("-").map(Number); return Date.UTC(y, m - 1, d) / 86400000; };
// Số ngày từ ngày `from` đến ngày `to` (cả hai "YYYY-MM-DD"); dương nếu `to` sau `from`
export const dayDiff = (from, to) => dayNum(to) - dayNum(from);
