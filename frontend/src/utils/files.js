// Giới hạn khớp backend (routers/attachments.py): PDF/JPG/PNG, tối đa 5 MB mỗi tệp, 10 tệp mỗi hồ sơ.
// Backend vẫn kiểm tra lại bằng chữ ký đầu tệp; kiểm tra ở đây chỉ để báo lỗi sớm.
export const MAX_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 10;
export const ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";
const OK_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function fileError(file, existing = 0) {
  if (existing >= MAX_FILES) return `Mỗi hồ sơ tối đa ${MAX_FILES} tệp`;
  if (!file.size) return "Tệp rỗng";
  if (file.size > MAX_BYTES) return `Vượt quá ${MAX_BYTES / 1024 / 1024} MB`;
  const typeOk = OK_TYPES.includes(file.type) || (!file.type && /\.(pdf|jpe?g|png)$/i.test(file.name));
  return typeOk ? null : "Chỉ nhận tệp PDF, JPG hoặc PNG";
}

export const formatSize = (n) => (n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`);

// Tải tệp đã có Authorization (thẻ <a href> không gửi được header) rồi cho trình duyệt lưu
export function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
