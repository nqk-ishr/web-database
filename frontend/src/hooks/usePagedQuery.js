import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

/**
 * Danh sách phân trang + bộ lọc, đồng bộ với backend ({ items, total, page, size, pages }).
 *   const list = usePagedQuery(["requests"], (p) => getRequests(p), { status: "pending_approval" });
 *   list.setFilter({ q: "59X3" })   // đổi bộ lọc => tự về trang 1
 *   list.setPage(2)
 * fetcher nhận { page, size, ...bộ lọc } (dùng clean() để bỏ tham số rỗng).
 */
export function usePagedQuery(key, fetcher, initial = {}) {
  const [params, setParams] = useState({ page: 1, size: 20, ...initial });
  const query = useQuery({
    queryKey: [...key, params],
    queryFn: () => fetcher(params),
    placeholderData: keepPreviousData,       // giữ dữ liệu cũ khi đang tải trang mới, không nháy trắng
  });
  const setFilter = (patch) => setParams((p) => ({ ...p, ...patch, page: 1 }));
  const setPage = (page) => setParams((p) => ({ ...p, page }));
  return { params, setFilter, setPage, ...query };
}
