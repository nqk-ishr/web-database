import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useMyVehicles } from "../../hooks/useVehicles";
import { useMyRequests } from "../../hooks/useRequests";
import { useMyClaims } from "../../hooks/useClaims";
import { waitingForMe } from "../../utils/requests";
import VehicleCard from "../../components/domain/VehicleCard";
import { PageHeader } from "../../components/ui/Field";
import { Loading, ErrorBox, Empty } from "../../components/feedback/State";

export default function HomePage() {
  const { user } = useAuth();
  const { data, isLoading, error, refetch } = useMyVehicles();
  const { data: claims } = useMyClaims();
  const { data: requests } = useMyRequests();       // chỉ để hiện thông báo, lỗi không chặn trang
  if (isLoading) return <Loading />;
  if (error) return <ErrorBox error={error} onRetry={refetch} />;
  const unpaid = data.reduce((s, v) => s + v.unpaid_violations, 0);
  const needInfo = (claims ?? []).filter((c) => c.canSupplement).length;
  const incoming = (requests ?? []).filter((r) => waitingForMe(r, user.user_id)).length;
  return (
    <>
      <PageHeader title="Xe của tôi" subtitle={`${data.length} xe đang đứng tên bạn`}
        actions={<Link className="btn" to="/register-vehicle">Đăng ký xe mới</Link>} />
      {needInfo > 0 && (
        <div className="card alert"><div className="row">
          <p><b>{needInfo} yêu cầu bồi thường cần bạn bổ sung thông tin.</b></p>
          <Link className="btn btn2" to="/claims">Xem yêu cầu</Link></div></div>
      )}
      {incoming > 0 && (
        <div className="card alert"><div className="row">
          <p><b>{incoming} hồ sơ sang tên đang chờ bạn xác nhận</b> với tư cách bên mua.</p>
          <Link className="btn btn2" to="/requests">Xem hồ sơ</Link></div></div>
      )}
      {unpaid > 0 && (
        <div className="card alert"><div className="row">
          <p><b>Bạn có {unpaid} vi phạm chưa nộp phạt.</b> Xe còn nợ phạt sẽ không sang tên được cho đến khi nộp xong.</p>
          <Link className="btn btn2" to="/violations">Xem vi phạm</Link></div></div>
      )}
      {data.length === 0
        ? <Empty text="Bạn chưa có xe nào. Hãy đăng ký xe mới." />
        : <div className="grid">{data.map((v) => <VehicleCard key={v.vehicle_id} v={v} />)}</div>}
    </>
  );
}
