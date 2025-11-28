import { describe, it, expect, vi, beforeEach } from "vitest";

const apiMock = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/lib/http/api", () => {
  return {
    __esModule: true,
    api: apiMock,
    default: apiMock,
  };
});

import {
  uploadDocumentForReservation,
  listDocumentsByReservation,
  deleteDocument,
  listAllDocuments,
  validateDocument,
  getDocumentFileUrl,
} from "./documents";

describe("documents http helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploadDocumentForReservation envia multipart form e retorna o documento", async () => {
    const fakeDoc = {
      id: "d1",
      type: "CNH",
      status: "PENDING",
    } as any;

    apiMock.post.mockResolvedValueOnce({ data: fakeDoc });

    const file = new File(["data"], "cnh.png", { type: "image/png" });
    const result = await uploadDocumentForReservation("r1", {
      file,
      type: "CNH",
    });

    expect(apiMock.post).toHaveBeenCalledTimes(1);
    const [url, body, config] = apiMock.post.mock.calls[0];

    expect(url).toBe("/reservations/r1/documents");
    expect(config.headers["Content-Type"]).toBe("multipart/form-data");
    expect(body instanceof FormData).toBe(true);
    expect(result).toBe(fakeDoc);
  });

  it("listDocumentsByReservation delega para /reservations/:id/documents", async () => {
    apiMock.get.mockResolvedValueOnce({ data: [{ id: "d1" }] });

    const docs = await listDocumentsByReservation("r1");

    expect(apiMock.get).toHaveBeenCalledWith(
      "/reservations/r1/documents",
    );
    expect(docs).toEqual([{ id: "d1" }]);
  });

  it("listDocumentsByReservation retorna [] quando data é null/undefined", async () => {
    apiMock.get.mockResolvedValueOnce({ data: null });

    const docs = await listDocumentsByReservation("r1");
    expect(docs).toEqual([]);
  });

  it("deleteDocument chama DELETE /documents/:id", async () => {
    apiMock.delete.mockResolvedValueOnce({});

    await deleteDocument("d1");
    expect(apiMock.delete).toHaveBeenCalledWith("/documents/d1");
  });

  it("listAllDocuments retorna lista ou []", async () => {
    apiMock.get.mockResolvedValueOnce({ data: [{ id: "d1" }] });
    const docs1 = await listAllDocuments();
    expect(apiMock.get).toHaveBeenCalledWith("/documents");
    expect(docs1).toEqual([{ id: "d1" }]);

    apiMock.get.mockResolvedValueOnce({ data: undefined });
    const docs2 = await listAllDocuments();
    expect(docs2).toEqual([]);
  });

  it("validateDocument envia resultado e comentário quando presente", async () => {
    const returned = {
      id: "d1",
      status: "VALIDATED",
    } as any;
    apiMock.patch.mockResolvedValueOnce({ data: returned });

    const result = await validateDocument("d1", "VALIDATED", " ok ");

    expect(apiMock.patch).toHaveBeenCalledWith("/documents/d1/validate", {
      result: "VALIDATED",
      comment: "ok",
    });
    expect(result).toBe(returned);
  });

  it("validateDocument não envia comentário vazio", async () => {
    apiMock.patch.mockResolvedValueOnce({ data: {} });

    await validateDocument("d1", "REJECTED", "   ");

    expect(apiMock.patch).toHaveBeenCalledWith("/documents/d1/validate", {
      result: "REJECTED",
    });
  });

  it("getDocumentFileUrl monta URL do proxy", () => {
    expect(getDocumentFileUrl("abc")).toBe("/api/documents/abc/file");
  });
});
