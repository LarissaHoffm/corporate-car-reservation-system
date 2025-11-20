import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import { useToast } from "@/components/ui/use-toast";
import {
  ChecklistsAPI,
  type ChecklistTemplate,
} from "@/lib/http/checklists";

export default function RequesterReservationChecklist() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getReservation } = useReservations();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [items, setItems] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  const extractErrorMessage = (err: any, fallback: string): string => {
    const msg = err?.response?.data?.message ?? err?.message;
    if (Array.isArray(msg) && msg.length) return String(msg[0]);
    if (typeof msg === "string" && msg.trim().length > 0) return msg;
    return fallback;
  };

  useEffect(() => {
    let mounted = true;

    if (!id) {
      setErr("Invalid reservation id.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        // garante que a reserva existe / permissão de acesso
        await getReservation(id);

        // busca o checklist vinculado ao carro dessa reserva
        const tpl = await ChecklistsAPI.getTemplateForReservation(id);

        if (!mounted) return;

        if (!tpl) {
          setErr(
            "No checklist is configured for this reservation. Please contact the administrator.",
          );
          return;
        }

        setTemplate(tpl);

        const start: Record<string, boolean> = {};
        [...tpl.items]
          .sort((a, b) => a.order - b.order)
          .forEach((item) => {
            start[item.id] = false;
          });

        setItems(start);
      } catch (e: any) {
        if (!mounted) return;
        const msg = extractErrorMessage(
          e,
          "Unable to load checklist for this reservation.",
        );
        setErr(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, getReservation]);

  const allChecked =
    !!template && template.items.every((item) => !!items[item.id]);

  async function handleFinalizeReservation() {
    if (!id || !template) return;

    if (!allChecked) {
      toast({
        title: "Checklist incomplete",
        description:
          "Please check all items before finalizing the reservation.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // envia checklist de devolução (USER_RETURN) para o backend
      await ChecklistsAPI.submitUserReturn(id, template, items);

      // mantém o marcador local que já existia no fluxo antigo
      try {
        sessionStorage.setItem(
          `reservationChecklistCompleted:${id}`,
          "true",
        );
      } catch {
        // ignore storage errors
      }

      toast({
        title: "Checklist completed",
        description:
          "Your checklist was submitted and the reservation is now waiting for validation.",
      });

      navigate("/requester/reservations");
    } catch (e: any) {
      const msg = extractErrorMessage(
        e,
        "Unable to submit checklist. Please try again.",
      );
      toast({
        title: "Erro ao enviar checklist",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Conclude Reservation</h1>
          <p className="text-sm text-muted-foreground">
            Step 3 of 3 — Final checklist.
          </p>
        </div>
        <Link to={`/requester/reservations/${id}/upload`}>
          <Button variant="ghost">Back to Upload</Button>
        </Link>
      </div>

      {/* Stepper visual */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-full bg-muted/60 px-3 py-2 text-center text-foreground">
          1. Details
        </div>
        <div className="rounded-full bg-muted/60 px-3 py-2 text-center text-foreground">
          2. Upload
        </div>
        <div className="rounded-full bg-[#1558E9] px-3 py-2 text-center text-white">
          3. Checklist
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {template?.name ?? "Return Checklist"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : !template ? (
            <p className="text-sm text-muted-foreground">
              No checklist is configured for this reservation.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {[...template.items]
                  .sort((a, b) => a.order - b.order)
                  .map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 text-sm"
                    >
                      <Checkbox
                        checked={!!items[item.id]}
                        onCheckedChange={(v) =>
                          setItems((s) => ({ ...s, [item.id]: !!v }))
                        }
                      />
                      {item.label}
                    </label>
                  ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link to={`/requester/reservations/${id}/upload`}>
                  <Button variant="outline">Back</Button>
                </Link>
                <Button
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                  onClick={handleFinalizeReservation}
                  disabled={!allChecked || submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizing…
                    </>
                  ) : (
                    "Finalize Reservation"
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
