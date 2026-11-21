// Backend trả { detail: "..." } (thông báo tiếng Việt từ trigger) -> hiển thị thẳng
export const errorMessage = (e) => e?.response?.data?.detail || e?.message || "Đã có lỗi xảy ra, vui lòng thử lại";
