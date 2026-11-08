// Dữ liệu giả khi VITE_USE_MOCK=true (backend chưa xong). Cùng hình dạng với API thật.
export const db = {
  vehicles: [
    { vehicle_id: 1, plate_number: "30A-123.45", status: "normal", vehicle_type: "Ô tô con", manufacture_year: 2021, chassis_number: "RLVA2K9X21", engine_number: "EN5521098", unpaid_violations: 2,
      policy: { status: "active", product_name: "Ô tô Mở rộng", start_date: "2026-03-15", end_date: "2027-03-14", liability_limit: 150000000, includes_theft: true } },
    { vehicle_id: 2, plate_number: "29B1-567.89", status: "normal", vehicle_type: "Xe máy", manufacture_year: 2019, chassis_number: "RLHJF1234K", engine_number: "EN7788", unpaid_violations: 0,
      policy: { status: "active", product_name: "Xe máy Cơ bản", start_date: "2025-11-20", end_date: "2026-11-19", liability_limit: 50000000, includes_theft: false } },
    { vehicle_id: 3, plate_number: "30F-888.01", status: "stolen", vehicle_type: "Ô tô con", manufacture_year: 2020, chassis_number: "RLVB3M0Y20", engine_number: "EN1204", unpaid_violations: 0, policy: null },
  ],
  owners: { 1: [
    { owner_name: "Nguyễn Văn An", valid_from: "2024-06-10", valid_to: null },
    { owner_name: "Trần Thị Bình", valid_from: "2021-03-20", valid_to: "2024-06-10" } ] },
  violations: [
    { violation_id: 11, occurred_at: "2026-10-05T08:12:00+07:00", plate_number: "30A-123.45", type: "Vượt đèn đỏ", status: "notified", fine_amount: 4000000, due_date: "2026-10-29" },
    { violation_id: 12, occurred_at: "2026-10-21T17:40:00+07:00", plate_number: "30A-123.45", type: "Dừng đỗ sai quy định", status: "notified", fine_amount: 800000, due_date: "2026-11-20" },
    { violation_id: 13, occurred_at: "2026-11-03T09:05:00+07:00", plate_number: "29B1-567.89", type: "Chạy quá tốc độ", status: "verified", fine_amount: null, due_date: null },
    { violation_id: 14, occurred_at: "2026-08-12T14:30:00+07:00", plate_number: "30A-123.45", type: "Đi sai làn đường", status: "paid", fine_amount: 600000, due_date: "2026-09-05" },
  ],
};
export const wait = (v) => new Promise((r) => setTimeout(() => r(structuredClone(v)), 250));
