import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import { useToast } from "@/components/ui/use-toast";

const defaultItems = [
  { key: "fuel", label: "Fuel level verified" },
  { key: "photos", label: "Photos taken (exterior / interior)" },
  { key: "docs", label: "Documents uploaded/verified" },
  { key: "clean", label: "Car cleanliness checked" },
];

export default function RequesterReservationChecklist() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { getReservation } = useReservations();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    // se a rota veio sem id, já falha aqui
    if (!id) {
      setErr("Invalid reservation id.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        await getReservation(id);
        if (mounted) {
          const start: Record<string, boolean> = {};
          defaultItems.forEach((i) => {
            start[i.key] = false;
          });
          setItems(start);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) {
          setErr(
            e?.response?.data?.message ||
              e?.message ||
              "Unable to load reservation.",
          );
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [id, getReservation]);

  const allChecked = defaultItems.every((i) => !!items[i.key]);

  function handleFinalizeReservation() {
    if (!id) return;

    if (!allChecked) {
      toast({
        title: "Checklist incomplete",
        description: "Please check all items before finalizing the reservation.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    // Marca localmente que o checklist foi concluído para esta reserva.
    // Isso será usado na tela de lista para esconder o botão "Conclude"
    // e exibir um label de "Pending validation" apenas na UI.
    try {
      sessionStorage.setItem(
        `reservationChecklistCompleted:${id}`,
        "true",
      );
    } catch {
      // se der erro no storage, não quebramos o fluxo
    }

    toast({
      title: "Checklist completed",
      description: "Your reservation is now waiting for document validation.",
    });

    // volta para a lista do requester
    navigate("/requester/reservations");

    // o componente será desmontado na navegação,
    // mas mantemos por segurança
    setSubmitting(false);
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
          <CardTitle className="text-base">Return Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {defaultItems.map((i) => (
                  <label
                    key={i.key}
                    className="flex items-center gap-3 text-sm"
                  >
                    <Checkbox
                      checked={!!items[i.key]}
                      onCheckedChange={(v) =>
                        setItems((s) => ({ ...s, [i.key]: !!v }))
                      }
                    />
                    {i.label}
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
