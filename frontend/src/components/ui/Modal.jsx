import { useEffect, useRef } from "react";

// Hộp thoại có thể truy cập: Esc hoặc bấm nền để đóng, trả focus về nút đã mở nó.
export default function Modal({ open, title, onClose, children, footer }) {
  const box = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;           // tránh chạy lại effect (và cướp focus) mỗi lần render

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === "Escape") closeRef.current?.(); };
    document.addEventListener("keydown", onKey);
    box.current?.focus();
    return () => { document.removeEventListener("keydown", onKey); prev?.focus?.(); };
  }, [open]);

  if (!open) return null;
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeRef.current?.(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" tabIndex={-1} ref={box}>
        <h2 id="modal-title">{title}</h2>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
