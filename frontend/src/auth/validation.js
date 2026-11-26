// Kiểm tra phía trình duyệt, khớp luật của backend (schemas/auth.py) để báo lỗi sớm.
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// bcrypt chỉ dùng 72 byte đầu: chặn mật khẩu dài hơn thay vì để bị cắt âm thầm
export function passwordError(p) {
  if (!p || p.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  if (new TextEncoder().encode(p).length > 72) return "Mật khẩu quá dài (tối đa 72 byte)";
  return null;
}

export function validateRegister(f) {
  const e = {};
  if (!/^[A-Za-z0-9._-]{3,50}$/.test(f.username)) e.username = "3–50 ký tự: chữ không dấu, số, dấu . _ -";
  if (!f.full_name.trim()) e.full_name = "Vui lòng nhập họ tên";
  else if (f.full_name.trim().length > 150) e.full_name = "Họ tên tối đa 150 ký tự";
  if (!/^[0-9]{9,12}$/.test(f.citizen_id)) e.citizen_id = "CCCD/CMND gồm 9 đến 12 chữ số";
  if (f.phone && !/^[0-9+().\s-]{8,20}$/.test(f.phone)) e.phone = "Số điện thoại không hợp lệ";
  if (f.email && !EMAIL.test(f.email)) e.email = "Email không hợp lệ";
  const pe = passwordError(f.password);
  if (pe) e.password = pe;
  if (f.confirm !== f.password) e.confirm = "Mật khẩu nhập lại không khớp";
  return e;
}

export function validatePasswordChange(f) {
  const e = {};
  if (!f.old_password) e.old_password = "Vui lòng nhập mật khẩu hiện tại";
  const pe = passwordError(f.new_password);
  if (pe) e.new_password = pe;
  else if (f.new_password === f.old_password) e.new_password = "Mật khẩu mới phải khác mật khẩu hiện tại";
  if (f.confirm !== f.new_password) e.confirm = "Mật khẩu nhập lại không khớp";
  return e;
}
