// Nhãn + ô nhập + gợi ý/lỗi:  <Field label="Biển số" error={errs.plate}><input .../></Field>
export function Field({ label, error, hint, children }) {
  return (
    <label className="field">
      {label}
      {children}
      {error ? <span className="err" role="alert">{error}</span> : hint && <span className="muted">{hint}</span>}
    </label>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="row">
      <div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div>
      {actions && <div className="row" style={{ gap: 8 }}>{actions}</div>}
    </div>
  );
}
