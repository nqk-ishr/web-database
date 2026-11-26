// Bỏ các tham số rỗng / false trước khi gửi lên API (vd. q="" hay overdue=false)
export const clean = (o) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== "" && v != null && v !== false));
