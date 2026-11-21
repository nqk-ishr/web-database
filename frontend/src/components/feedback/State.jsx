import { errorMessage } from "../../utils/errors";
export const Loading = () => <p className="muted" role="status">Đang tải…</p>;
export const Empty = ({ text }) => <p className="muted">{text}</p>;
export const ErrorBox = ({ error, onRetry }) => (
  <div className="card" role="alert" style={{ background: "#FADADD", borderColor: "#E8A5AB" }}>
    <p>{errorMessage(error)}</p>
    {onRetry && <button className="btn btn2" type="button" onClick={onRetry}>Thử lại</button>}
  </div>
);
