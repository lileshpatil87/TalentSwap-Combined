import type { DocumentItem } from "@talentswap/types";
import { apiRequest } from "@/lib/api";

type DocumentRecord = { id: string; originalName: string; fileType: string; sizeBytes: number; status: string; createdAt: string };
type PresignedUpload = { key: string; uploadUrl: string; expiresIn: number; maxBytes: number };

function toDocumentItem(record: DocumentRecord): DocumentItem {
  const status: DocumentItem["status"] = record.status === "APPROVED" ? "VERIFIED" : record.status === "REJECTED" ? "REJECTED" : record.status === "SCANNING" ? "UNDER_REVIEW" : record.status === "PENDING_REVIEW" ? "UNDER_REVIEW" : record.status === "SCAN_FAILED" ? "SCAN_FAILED" : "PENDING";
  return { id: record.id, name: record.originalName, type: record.fileType, size: record.sizeBytes, status, uploadedAt: record.createdAt };
}

function uploadToSignedUrl(url: string, file: File, onProgress: (value: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); };
    xhr.onerror = () => reject(new Error("File upload failed. Check your network and storage CORS configuration."));
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Storage upload failed with HTTP ${xhr.status}.`));
    xhr.send(file);
  });
}

export const documentsApi = {
  list: async (): Promise<DocumentItem[]> => (await apiRequest<DocumentRecord[]>("/documents")).map(toDocumentItem),
  upload: async (file: File): Promise<DocumentItem> => documentsApi.uploadWithProgress(file, () => undefined),
  uploadWithProgress: async (file: File, onProgress: (value: number) => void): Promise<DocumentItem> => {
    const presigned = await apiRequest<PresignedUpload>("/storage/presign", { method: "POST", body: { filename: file.name, contentType: file.type, size: file.size } });
    await uploadToSignedUrl(presigned.uploadUrl, file, onProgress);
    await apiRequest<{ key: string; confirmed: boolean }>("/storage/confirm", { method: "POST", body: { key: presigned.key } });
    const record = await apiRequest<DocumentRecord>("/documents", { method: "POST", body: { fileKey: presigned.key, fileType: file.type, originalName: file.name } });
    onProgress(100);
    return toDocumentItem(record);
  },
};
