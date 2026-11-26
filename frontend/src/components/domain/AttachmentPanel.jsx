import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useAttachments, useDeleteAttachment, useUploadAttachment } from "../../hooks/useAttachments";
import { downloadAttachment } from "../../api/attachments";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useToast } from "../ui/Toast";
import { ErrorBox, Loading } from "../feedback/State";
import { ACCEPT, MAX_BYTES, MAX_FILES, fileError, formatSize, saveBlob } from "../../utils/files";
import { errorMessage } from "../../utils/errors";
import { dateTime } from "../../utils/format";

/**
 * Tệp đính kèm của một hồ sơ. kind: "requests" | "claims" (dùng lại cho yêu cầu bồi thường).
 * canEdit: người gửi và hồ sơ còn mở (backend cũng kiểm tra lại, trả 409 nếu đã khóa).
 */
export default function AttachmentPanel({ kind, parentId, canEdit }) {
  const { user } = useAuth();
  const toast = useToast();
  const list = useAttachments(kind, parentId);
  const upload = useUploadAttachment(kind, parentId);
  const remove = useDeleteAttachment(kind, parentId);
  const [toDelete, setToDelete] = useState(null);
  const files = list.data ?? [];

  const onPick = async (e) => {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";                         // cho phép chọn lại cùng một tệp
    let count = files.length;
    for (const f of picked) {
      const err = fileError(f, count);
      if (err) { toast.error(`${f.name}: ${err}`); continue; }
      try { await upload.mutateAsync(f); count += 1; toast.success(`Đã tải lên ${f.name}`); }
      catch (x) { toast.error(`${f.name}: ${errorMessage(x)}`); }
    }
  };
  const download = async (a) => {
    try { saveBlob(await downloadAttachment(a), a.original_name); } catch (x) { toast.error(x); }
  };
  const confirmDelete = () => remove.mutate(toDelete.attachment_id, {
    onSuccess: () => { toast.success("Đã xóa tệp"); setToDelete(null); },
    onError: (x) => { toast.error(x); setToDelete(null); },
  });

  return (
    <section className="card">
      <div className="row"><h2>Tệp đính kèm ({files.length})</h2>
        {canEdit && files.length < MAX_FILES && (
          <label className="btn btn2 sm">{upload.isPending ? "Đang tải lên…" : "Thêm tệp"}
            <input className="sr-only" type="file" multiple accept={ACCEPT} disabled={upload.isPending} onChange={onPick} />
          </label>
        )}
      </div>
      <p className="muted">PDF, JPG hoặc PNG, tối đa {MAX_BYTES / 1024 / 1024} MB mỗi tệp, tối đa {MAX_FILES} tệp.</p>
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox error={list.error} onRetry={list.refetch} /> : files.length === 0
        ? <p className="muted">Chưa có tệp nào.</p> : (
          <ul className="files">
            {files.map((a) => (
              <li key={a.attachment_id}>
                <span><b>{a.original_name}</b> <span className="muted">· {formatSize(a.size_bytes)} · {dateTime(a.created_at)}</span></span>
                <span className="row" style={{ gap: 8 }}>
                  <button className="btn btn2 sm" type="button" onClick={() => download(a)}>Tải xuống</button>
                  {canEdit && a.uploaded_by === user?.user_id && (
                    <button className="btn btn2 sm" type="button" onClick={() => setToDelete(a)}>Xóa</button>)}
                </span>
              </li>
            ))}
          </ul>
        )}
      {toDelete && (
        <ConfirmDialog open title="Xóa tệp" danger confirmText="Xóa" busy={remove.isPending}
          message={`Xóa “${toDelete.original_name}”? Thao tác này không hoàn tác được.`}
          onCancel={() => setToDelete(null)} onConfirm={confirmDelete} />
      )}
    </section>
  );
}
