import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { errorMessage } from "../../utils/errors";

const ToastContext = createContext(null);
// const toast = useToast(); toast.success("Đã lưu"); toast.error(err)   (err: chuỗi hoặc lỗi axios)
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const seq = useRef(0);
  const dismiss = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);
  const push = useCallback((tone, text, ms) => {
    const id = ++seq.current;
    setItems((xs) => [...xs, { id, tone, text }]);
    setTimeout(() => dismiss(id), ms);
  }, [dismiss]);
  const api = useMemo(() => ({
    success: (t) => push("ok", t, 5000),
    info: (t) => push("info", t, 5000),
    error: (e) => push("bad", errorMessage(e), 8000),
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`} role={t.tone === "bad" ? "alert" : "status"}>
            <span>{t.text}</span>
            <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
