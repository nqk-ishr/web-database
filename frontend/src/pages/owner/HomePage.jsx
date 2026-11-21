import { Link } from "react-router-dom";
import { useMyVehicles } from "../../hooks/useVehicles";
import VehicleCard from "../../components/domain/VehicleCard";
import { Loading, ErrorBox, Empty } from "../../components/feedback/State";

export default function HomePage() {
  const { data, isLoading, error, refetch } = useMyVehicles();
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  const unpaid = data.reduce((s, v) => s + v.unpaid_violations, 0);
  return (
    <>
      <div className="row"><div><h1>Xe của tôi</h1><p className="muted">{data.length} xe đang đứng tên bạn</p></div>
        <button className="btn" type="button">Đăng ký xe mới</button></div>
      {unpaid > 0 && (
        <div className="card alert"><div className="row"><p><b>Bạn có {unpaid} vi phạm chưa nộp phạt.</b> Xe còn nợ phạt sẽ không sang tên được cho đến khi nộp xong.</p>
          <Link className="btn btn2" to="/violations">Xem vi phạm</Link></div></div>)}
      {data.length === 0 ? <Empty text="Bạn chưa có xe nào. Hãy đăng ký xe mới." /> : <div className="grid">{data.map((v) => <VehicleCard key={v.vehicle_id} v={v} />)}</div>}
    </>
  );
}
