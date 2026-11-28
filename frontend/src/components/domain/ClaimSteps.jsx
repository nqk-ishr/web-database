import { CLAIM_STEPS, claimProgress } from "../../utils/claims";

// Tiến trình: Gửi yêu cầu → Thẩm định → Duyệt → Chi trả (không hiện khi bị từ chối / đã hủy)
export default function ClaimSteps({ status }) {
  const done = claimProgress(status);
  if (done === null) return null;
  return (
    <ol className="steps" aria-label="Tiến trình bồi thường">
      {CLAIM_STEPS.map((label, i) => (
        <li key={label} className={i < done ? "done" : i === done ? "current" : undefined} aria-current={i === done ? "step" : undefined}>{label}</li>
      ))}
    </ol>
  );
}
