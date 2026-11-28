import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAttachment, listAttachments, uploadAttachment } from "../api/attachments";

export const useAttachments = (kind, id) => useQuery({ queryKey: ["attachments", kind, id], queryFn: () => listAttachments(kind, id) });

function useAttachmentMutation(kind, id, fn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: ["attachments", kind, id] }) });
}
export const useUploadAttachment = (kind, id) => useAttachmentMutation(kind, id, (file) => uploadAttachment(kind, id, file));
export const useDeleteAttachment = (kind, id) => useAttachmentMutation(kind, id, (attachmentId) => deleteAttachment(kind, id, attachmentId));
