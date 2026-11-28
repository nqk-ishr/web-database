import { useEffect, useRef } from "react";
import Modal from "../ui/Modal";

/**
 * Hộp thoại có biểu mẫu (cấp biển số, ra quyết định xử phạt, duyệt bồi thường...).
 *   <FormDialog title="Duyệt hồ sơ" submitText="Duyệt" busy={m.isPending} disabled={!valid}
 *               onSubmit={save} onCancel={close}> ...các Field... </FormDialog>
 * Nhấn Enter trong ô nhập cũng gửi biểu mẫu.
 */
export default function FormDialog({ title, submitText = "Lưu", danger = false, busy = false, disabled = false,
  onSubmit, onCancel, children }) {
  const form = useRef(null);
  // Modal đặt focus vào khung hộp thoại; chuyển tiếp vào ô nhập đầu tiên để gõ và nhấn Enter được ngay
  useEffect(() => { form.current?.querySelector("input, select, textarea")?.focus(); }, []);
  return (
    <Modal open title={title} onClose={busy ? undefined : onCancel}>
      <form ref={form} className="modal-body" noValidate onSubmit={(e) => { e.preventDefault(); if (!busy && !disabled) onSubmit(); }}>
        {children}
        <div className="modal-foot">
          <button className="btn btn2" type="button" onClick={onCancel} disabled={busy}>Hủy</button>
          <button className={`btn${danger ? " danger" : ""}`} type="submit" disabled={busy || disabled}>
            {busy ? "Đang xử lý…" : submitText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
