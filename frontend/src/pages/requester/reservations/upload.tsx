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

export default function RequesterReservationUpload() {
  const id = useReservationId();
  const navigate = useNavigate();
  const { getReservation } = useReservations();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // documentos atuais dessa reserva (estado só no front)
  const [files, setFiles] = useState<ApiDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [currentDocType, setCurrentDocType] = useState<DocumentType | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Carrega reserva (para garantir que existe) + documentos atuais */
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

        // carrega documentos atuais uma vez
        const docs = await listDocumentsByReservation(id);
        if (!mounted) return;
        setFiles(docs);
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

  /** Helper: verifica se já existe documento de certo tipo */
  const hasType = React.useCallback(
    (type: DocumentType) => files.some((f) => f.type === type),
    [files],
  );

  /** Dispara o input de arquivo com o tipo selecionado */
  const handleChooseFile = (type: DocumentType) => {
    if (!id) return;
    setCurrentDocType(type);
    fileInputRef.current?.click();
  };

  /** Upload de arquivo (estado só no front, sem refetch geral) */
  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file || !id || !currentDocType) return;

    try {
      setUploading(true);
      const uploaded = await uploadDocumentForReservation(id, {
        file,
        type: currentDocType,
      });

      // adiciona no estado local (sem rebuscar tudo do backend)
      setFiles((prev) => [...prev, uploaded]);
      setCurrentDocType(null);
    } catch (err) {
      console.error(err);
      // aqui poderíamos usar toast, mas para manter simples só loga
      alert("Erro ao enviar documento. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  /** Exclusão só visual (remove do estado local) */
  const handleDelete = (docId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== docId));
  };

  /** Nome "bonito" do arquivo */
  const getFilename = (f: ApiDocument) => {
    const metaName =
      (f as any)?.metadata?.filename &&
      typeof (f as any).metadata?.filename === "string"
        ? ((f as any).metadata?.filename as string)
        : "";
    if (metaName) return metaName;

    const fromUrl = f.url.split("/").pop() ?? f.id;
    // remove prefixo numérico "timestamp_uuid_" se existir
    const parts = fromUrl.split("_");
    return parts.length > 2 ? parts.slice(2).join("_") : fromUrl;
  };

  const driverDocsCards = useMemo(
    () => (
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
    ),
    [hasType],
  );

  const vehicleDocsCards = useMemo(
    () => (
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
    ),
    [hasType],
  );

  return (
    <div className="mx-auto p-6 max-w-[1200px] space-y-6">
      {/* Topo – NÃO mexi no layout que você marcou em verde */}
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
              {/* Cards iguais à tela de Documents */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {driverDocsCards}
                {vehicleDocsCards}
              </div>

              {/* Input de arquivo oculto */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf"
              />

              {/* Lista de arquivos atuais (com opção de excluir) */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">
                  Uploaded files for this reservation
                </h4>
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No files uploaded yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {files.map((f) => {
                      const filename = getFilename(f);
                      const isImage = /\.(png|jpe?g)$/i.test(filename);
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
                            <span className="text-sm">{filename}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(f.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Navegação */}
              <div className="flex items-center justify-between pt-2">
                <Link to={`/requester/reservations/${id}`}>
                  <Button variant="outline">Back</Button>
                </Link>
                <Button
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                  onClick={() =>
                    navigate(`/requester/reservations/${id}/checklist`)
                  }
                  disabled={uploading}
                >
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
