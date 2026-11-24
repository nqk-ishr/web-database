// Khớp phản hồi phân trang của backend: { items, total, page, size, pages }
export default function Pagination({ page, pages, total, onPage }) {
  if (total == null) return null;
  return (
    <nav className="pager" aria-label="Phân trang">
      <span className="muted">{total} kết quả{pages > 1 ? ` · Trang ${page}/${pages}` : ""}</span>
      {pages > 1 && (
        <div className="row" style={{ gap: 8 }}>
          <button className="btn btn2 sm" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹ Trước</button>
          <button className="btn btn2 sm" type="button" disabled={page >= pages} onClick={() => onPage(page + 1)}>Sau ›</button>
        </div>
      )}
    </nav>
  );
}
