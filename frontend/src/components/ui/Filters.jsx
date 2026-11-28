import { useEffect, useRef, useState } from "react";

export const FilterBar = ({ children }) => <div className="filters">{children}</div>;

// Ô tìm kiếm có trễ 350 ms để không gọi API sau mỗi phím gõ
export function SearchInput({ value, onChange, label = "Tìm kiếm", placeholder = "Nhập từ khóa…", delay = 350 }) {
  const [text, setText] = useState(value ?? "");
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => { setText(value ?? ""); }, [value]);
  useEffect(() => {
    const t = setTimeout(() => { if (text.trim() !== (value ?? "")) cb.current(text.trim()); }, delay);
    return () => clearTimeout(t);
  }, [text, value, delay]);
  return (
    <label>{label}
      <input type="search" value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
    </label>
  );
}

// options: [{ value: "", label: "Tất cả" }, { value: "transfer", label: "Sang tên" }]
export function SelectFilter({ label, value, onChange, options }) {
  return (
    <label>{label}
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function DateRange({ from, to, onChange }) {
  return (
    <>
      <label>Từ ngày<input type="date" value={from ?? ""} onChange={(e) => onChange({ from_date: e.target.value })} /></label>
      <label>Đến ngày<input type="date" value={to ?? ""} onChange={(e) => onChange({ to_date: e.target.value })} /></label>
    </>
  );
}
