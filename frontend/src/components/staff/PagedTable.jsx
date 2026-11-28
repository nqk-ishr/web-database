import DataTable from "../ui/DataTable";
import Pagination from "../ui/Pagination";
import { ErrorBox, Loading } from "../feedback/State";

// Bảng + phân trang cho một danh sách lấy từ usePagedQuery (hooks/useStaff.js).
export default function PagedTable({ list, columns, rowKey, empty, onRowClick }) {
  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorBox error={list.error} onRetry={list.refetch} />;
  const d = list.data;
  return (
    <>
      <DataTable columns={columns} rows={d?.items} rowKey={rowKey} empty={empty} onRowClick={onRowClick} />
      <Pagination page={d?.page} pages={d?.pages} total={d?.total} onPage={list.setPage} />
    </>
  );
}

// Nút lọc theo trạng thái. tabs: [{ key, label }]
export function StatusTabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="group" aria-label="Lọc theo trạng thái">
      {tabs.map((t) => (
        <button key={t.key} type="button" className={`tab${value === t.key ? " on" : ""}`} aria-pressed={value === t.key}
          onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}

// Từ bảng nhãn trong constants/status.js sang options cho SelectFilter
export const optionsFrom = (map, allLabel = "Tất cả") =>
  [{ value: "", label: allLabel }, ...Object.entries(map).map(([value, s]) => ({ value, label: s.label ?? s }))];
