// Backend (FastAPI):
//   lỗi nghiệp vụ / trigger  -> { detail: "thông báo tiếng Việt" }
//   lỗi kiểm tra dữ liệu 422 -> { detail: [{ loc: ["body", "field"], msg: "..." }, ...] }
export const statusOf = (e) => e?.response?.status;

export function errorMessage(e) {
  if (typeof e === "string") return e;
  const d = e?.response?.data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d
      .map((x) => {
        const field = Array.isArray(x.loc) ? x.loc.filter((p) => p !== "body" && p !== "query" && p !== "path").join(".") : "";
        return field ? `${field}: ${x.msg}` : x.msg;
      })
      .join("; ");
  }
  if (e?.code === "ERR_NETWORK") return "Không kết nối được máy chủ, vui lòng kiểm tra mạng";
  return e?.message || "Đã có lỗi xảy ra, vui lòng thử lại";
}
