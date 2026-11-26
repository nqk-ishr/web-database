import { api, call } from "./client";
import { db, wait } from "./mockData";

// kind: "requests" (hồ sơ đăng ký/sang tên) hoặc "claims" (yêu cầu bồi thường)
const key = (kind, id) => `${kind}:${id}`;

export const listAttachments = (kind, id) =>
  call(() => api.get(`/${kind}/${id}/attachments`), () => wait(db.attachments[key(kind, id)] ?? []));

// multipart/form-data, trường "file". 413 quá lớn, 415 sai loại tệp, 409 hồ sơ không còn mở hoặc đủ 10 tệp
export const uploadAttachment = (kind, id, file) =>
  call(() => { const fd = new FormData(); fd.append("file", file); return api.post(`/${kind}/${id}/attachments`, fd); }, () => {
    const a = { attachment_id: Date.now(), original_name: file.name, content_type: file.type, size_bytes: file.size, uploaded_by: 1, created_at: new Date().toISOString() };
    (db.attachments[key(kind, id)] ??= []).push(a);
    return wait(a);
  });

export const deleteAttachment = (kind, parentId, attachmentId) =>
  call(() => api.delete(`/attachments/${attachmentId}`), () => {
    db.attachments[key(kind, parentId)] = (db.attachments[key(kind, parentId)] ?? []).filter((a) => a.attachment_id !== attachmentId);
    return wait({ ok: true });
  });

// Trả về Blob (cần gửi kèm token nên không dùng liên kết thẳng)
export const downloadAttachment = (a) =>
  import.meta.env.VITE_USE_MOCK === "true"
    ? wait(null).then(() => new Blob([`Tệp demo: ${a.original_name}`], { type: "text/plain" }))
    : api.get(`/attachments/${a.attachment_id}`, { responseType: "blob" }).then((r) => r.data);
