import { api } from "./api";

export type DocumentStatus = "PENDING" | "VALIDATED" | "REJECTED";
export type DocumentType = "CNH" | "RECEIPT" | "ODOMETER_PHOTO" | "OTHER";

export type Document = {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  url: string;
  createdAt: string;
  reservationId?: string;
  userId?: string;
  metadata?: any;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  reservation?: {
    id: string;
    origin: string;
    destination: string;
    startAt: string;
    endAt: string;
  } | null;
};

export async function uploadDocumentForReservation(
  reservationId: string,
  params: { file: File; type?: DocumentType },
): Promise<Document> {
  const form = new FormData();
  form.append("file", params.file);
  if (params.type) {
    form.append("type", params.type);
  }

  const { data } = await api.post<Document>(
    `/reservations/${reservationId}/documents`,
    form,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return data;
}

export async function listDocumentsByReservation(
  reservationId: string,
): Promise<Document[]> {
  const { data } = await api.get<Document[]>(
    `/reservations/${reservationId}/documents`,
  );
  return data ?? [];
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function listAllDocuments(): Promise<Document[]> {
  const { data } = await api.get<Document[]>(`/documents`);
  return data ?? [];
}

export async function validateDocument(
  id: string,
  result: "VALIDATED" | "REJECTED",
  comment?: string,
): Promise<Document> {
  const body: any = { result };
  if (comment && comment.trim()) {
    body.comment = comment.trim();
  }

  const { data } = await api.patch<Document>(
    `/documents/${id}/validate`,
    body,
  );
  return data;
}

export function getDocumentFileUrl(id: string): string {
  // /api vem do proxy (Caddy) roteando pro backend
  return `/api/documents/${id}/file`;
}
