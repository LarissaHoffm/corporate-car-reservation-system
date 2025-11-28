import * as React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ImageIcon, FileText, Trash2 } from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import {
  listDocumentsByReservation,
  uploadDocumentForReservation,
  type Document as ApiDocument,
  type DocumentType,
} from "@/lib/http/documents";

/** Hook para pegar :id da rota /requester/reservations/:id/upload */
function useReservationId() {
  const { id } = useParams<{ id: string }>();
  return id ?? "";
}

/** Documento pendente (ainda não enviado para o backend) */
type PendingFile = {
  id: string;
  type: DocumentType;
  file: File;
};

function makeTempId() {
  // id simples para uso em lista; não tem impacto no backend
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function RequesterReservationUpload() {
  const id = useReservationId();
  const navigate = useNavigate();
  const { getReservation } = useReservations();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Documentos já existentes no backend para esta reserva
  const [serverFiles, setServerFiles] = useState<ApiDocument[]>([]);
  // Documentos adicionados nesta tela, ainda não enviados para o backend
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);

  const [uploading, setUploading] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Carrega reserva (para garantir que existe) + documentos atuais do backend */
  useEffect(() => {
    if (!id) {
      setErr("Invalid reservation id.");
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      try {
        // garante que a reserva existe
        await getReservation(id);

        // carrega documentos já existentes no backend para essa reserva
        const docs = await listDocumentsByReservation(id);
        if (!mounted) return;
        setServerFiles(docs);
        setLoading(false);
      } catch (e: any) {
        if (!mounted) return;
        setErr(
          e?.response?.data?.message ||
            e?.message ||
            "Unable to load reservation.",
        );
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, getReservation]);

  /** Helper: verifica se já existe documento de certo tipo
   * (considerando tanto os já enviados quanto os pendentes)
   */
  const hasType = React.useCallback(
    (type: DocumentType) =>
      serverFiles.some((f) => f.type === type) ||
      pendingFiles.some((f) => f.type === type),
    [serverFiles, pendingFiles],
  );

  /** Dispara o input de arquivo com o tipo selecionado */
  const handleChooseFile = (type: DocumentType) => {
    if (!id) return;
    setCurrentDocType(type);
    fileInputRef.current?.click();
  };

  /** Quando o usuário escolhe um arquivo:
   *  - NÃO enviamos mais para o backend aqui
   *  - Apenas guardamos no estado de pendentes
   *  - O envio real acontece só ao clicar em "Continue to Checklist"
   */
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file || !id || !currentDocType) return;

    setPendingFiles((prev) => [
      ...prev,
      {
        id: makeTempId(),
        type: currentDocType,
        file,
      },
    ]);
    setCurrentDocType(null);
  };

  /** Exclusão de documento:
   *  - Só faz sentido para arquivos pendentes (ainda não enviados)
   *  - Remove do estado local; nada é enviado ao backend
   */
  const handleDeletePending = (docId: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== docId));
  };

  /** Nome "bonito" do arquivo para exibição */
  const getFilename = (doc: ApiDocument | (ApiDocument & { _filename?: string })) => {
    const anyDoc = doc as any;

    // 1) arquivos pendentes: usamos o nome do File
    if (typeof anyDoc._filename === "string" && anyDoc._filename) {
      return anyDoc._filename as string;
    }

    // 2) arquivos vindos do backend com metadata.filename
    const metaName =
      anyDoc?.metadata?.filename && typeof anyDoc.metadata.filename === "string"
        ? (anyDoc.metadata.filename as string)
        : "";
    if (metaName) return metaName;

    // 3) fallback a partir da URL
    const url: string = typeof anyDoc.url === "string" ? anyDoc.url : "";
    const fromUrl = url.split("/").pop() ?? (anyDoc.id as string);
    const parts = fromUrl.split("_");
    return parts.length > 2 ? parts.slice(2).join("_") : fromUrl;
  };

  /** Lista unificada para renderização:
   *  - primeiro os pendentes (com _kind = "pending" e _filename)
   *  - depois os já existentes no backend (com _kind = "existing")
   */
  const uiFiles = useMemo(
    () =>
      [
        // pendentes
        ...pendingFiles.map((p) => ({
          id: p.id,
          type: p.type,
          url: "",
          status: "PENDING" as any,
          createdAt: new Date().toISOString(),
          reservationId: id,
          userId: "",
          metadata: {},
          _kind: "pending" as const,
          _filename: p.file.name,
        })),
        // existentes
        ...serverFiles.map((d) => ({
          ...(d as any),
          _kind: "existing" as const,
        })),
      ] as Array<ApiDocument & { _kind?: "pending" | "existing"; _filename?: string }>,
    [pendingFiles, serverFiles, id],
  );

  /** Ao clicar em "Continue to Checklist":
   *  - Enviamos TODOS os arquivos pendentes para o backend
   *  - Se tudo der certo, seguimos para a tela de checklist
   *  - Se algo falhar, ficamos na tela e avisamos o usuário
   */
  const handleContinueToChecklist = async () => {
    if (!id) return;

    // Se não há pendentes, só navega
    if (pendingFiles.length === 0) {
      navigate(`/requester/reservations/${id}/checklist`);
      return;
    }

    try {
      setUploading(true);

      for (const p of pendingFiles) {
        await uploadDocumentForReservation(id, {
          file: p.file,
          type: p.type,
        });
      }

      // limpa pendentes após envio bem-sucedido
      setPendingFiles([]);
      navigate(`/requester/reservations/${id}/checklist`);
    } catch (error) {
      console.error(error);
      alert("Erro ao enviar documentos. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto p-6 max-w-[1200px] space-y-6">
      {/* Topo – mantém o layout original */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Conclude Reservation</h1>
          <p className="text-sm text-muted-foreground">
            Step 2 of 3 — Upload your documents.
          </p>
        </div>
        <Link to={`/requester/reservations/${id}`}>
          <Button variant="ghost">Back to Details</Button>
        </Link>
      </div>

      {/* Stepper visual */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-full px-3 py-2 bg-muted/60 text-foreground text-center">
          1. Details
        </div>
        <div className="rounded-full px-3 py-2 bg-[#1558E9] text-white text-center">
          2. Upload
        </div>
        <div className="rounded-full px-3 py-2 bg-muted/60 text-foreground text-center">
          3. Checklist
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upload Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="py-12 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : (
            <>
              {/* Cards de escolha de tipo de documento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-base font-medium text-foreground">
                    Driver Documents
                  </h3>

                  {!hasType("CNH") && (
                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={() => handleChooseFile("CNH")}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Upload Driver License (front &amp; back)
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {!hasType("OTHER") && (
                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={() => handleChooseFile("OTHER")}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Upload Insurance Proof
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-medium text-foreground">
                    Vehicle Documents
                  </h3>

                  {!hasType("RECEIPT") && (
                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={() => handleChooseFile("RECEIPT")}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Upload Fuel Receipt
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {!hasType("ODOMETER_PHOTO") && (
                    <Card
                      className="cursor-pointer border-2 border-dashed border-border bg-muted/20 transition-colors hover:border-[#1558E9]"
                      onClick={() => handleChooseFile("ODOMETER_PHOTO")}
                    >
                      <CardContent className="p-4 text-center">
                        <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                        <p className="text-sm font-medium text-foreground">
                          Upload Damage Photos (if any)
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Input de arquivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf"
              />

              {/* Lista de arquivos (pendentes + já enviados) */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">
                  Uploaded files for this reservation
                </h4>
                {uiFiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No files uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {uiFiles.map((f) => {
                      const filename = getFilename(f);
                      const isImage = /\.(png|jpe?g)$/i.test(filename);
                      const kind = (f as any)._kind as
                        | "pending"
                        | "existing"
                        | undefined;
                      const isPending = kind === "pending";

                      return (
                        <div
                          key={f.id}
                          className="flex items-center justify-between gap-3 rounded border border-border bg-card p-3 text-foreground"
                        >
                          <div className="flex items-center gap-2">
                            {isImage ? (
                              <ImageIcon className="h-4 w-4 text-[#1558E9]" />
                            ) : (
                              <FileText className="h-4 w-4 text-[#1558E9]" />
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm">{filename}</span>
                              {!isPending && (
                                <span className="text-[11px] text-muted-foreground">
                                  Already submitted
                                </span>
                              )}
                              {isPending && (
                                <span className="text-[11px] text-muted-foreground">
                                  Pending upload (will be sent on next step)
                                </span>
                              )}
                            </div>
                          </div>
                          {isPending && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDeletePending(f.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navegação */}
              <div className="flex items-center justify-between pt-2">
                <Link to={`/requester/reservations/${id}`}>
                  <Button variant="outline" disabled={uploading}>
                    Back
                  </Button>
                </Link>
                <Button
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                  onClick={handleContinueToChecklist}
                  disabled={uploading}
                >
                  {uploading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Continue to Checklist
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Aviso LGPD em toda a largura, rodapé da página */}
      <div className="mt-2 rounded-md border border-border/40 bg-muted/10 px-4 py-3">
        <p className="text-xs text-muted-foreground text-center">
          Seus documentos são usados apenas para validação da reserva,
          armazenados com segurança e acessados somente por usuarios autorizados.
        </p>
      </div>
    </div>
  );
}
