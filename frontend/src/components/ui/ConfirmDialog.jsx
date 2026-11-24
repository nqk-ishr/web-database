import { useEffect, useState } from "react";
import Modal from "./Modal";

/**
 * Xác nhận một thao tác. Với thao tác cần lý do/ghi chú (từ chối, yêu cầu bổ sung, hủy...) truyền `note`:
 *   <ConfirmDialog open title="Từ chối hồ sơ" note={{ label: "Lý do", required: true }}
 *                  confirmText="Từ chối" danger busy={m.isPending}
 *                  onConfirm={(text) => m.mutate(text)} onCancel={close} />
 * `onConfirm` nhận nội dung ô ghi chú (hoặc undefined nếu không có `note`).
 */
export default function ConfirmDialog({ open, title, message, confirmText = "Xác nhận", cancelText = "Hủy",
  danger = false, busy = false, note, children, onConfirm, onCancel }) {
  const [text, setText] = useState("");
  useEffect(() => { if (open) setText(""); }, [open]);
  const missing = Boolean(note?.required) && !text.trim();

  return (
    <Modal open={open} title={title} onClose={busy ? undefined : onCancel}
      footer={(
        <>
          <button className="btn btn2" type="button" onClick={onCancel} disabled={busy}>{cancelText}</button>
          <button className={`btn${danger ? " danger" : ""}`} type="button" disabled={busy || missing}
            onClick={() => onConfirm(note ? text.trim() : undefined)}>
            {busy ? "Đang xử lý…" : confirmText}
          </button>
        </>
      )}>
      {message && <p>{message}</p>}
      {children}
      {note && (
        <label>{note.label}
          <textarea rows={3} maxLength={note.maxLength ?? 500} value={text} placeholder={note.placeholder}
            onChange={(e) => setText(e.target.value)} />
        </label>
      )}
    </Modal>
  );
}
