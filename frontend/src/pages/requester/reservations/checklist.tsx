// frontend/src/pages/requester/reservations/checklist.tsx
import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import api from "@/lib/http/api";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

const defaultItems = [
  { key: "fuel", label: "Fuel level verified" },
  { key: "photos", label: "Photos taken (exterior / interior)" },
  { key: "docs", label: "Documents uploaded/verified" },
  { key: "clean", label: "Car cleanliness checked" },
];

export default function RequesterReservationChecklist() {
  const q = useQuery();
  const id = q.get("id") || "";
  const navigate = useNavigate();
  const { getReservation } = useReservations();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [items, setItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await getReservation(id);
        if (mounted) {
          const start: Record<string, boolean> = {};
          defaultItems.forEach((i) => (start[i.key] = false));
          setItems(start);
          setLoading(false);
        }
      } catch (e: any) {
        if (mounted) {
          setErr(e?.response?.data?.message || e?.message || "Unable to load reservation.");
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [id, getReservation]);

  async function finalize() {
    // Tenta completar; se rota não existir ainda, volta para a lista
    try {
      await api.patch(`/reservations/${id}/complete`);
    } catch {
      /* ignore silently */
    }
    navigate("/requester/reservations");
  }

  const allChecked = defaultItems.every((i) => !!items[i.key]);

  return (
    <div className="mx-auto p-6 max-w-[900px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Conclude Reservation</h1>
          <p className="text-sm text-muted-foreground">Step 3 of 3 — Final checklist.</p>
        </div>
        <Link to={`/requester/reservations/upload?id=${id}`}>
          <Button variant="ghost">Back to Upload</Button>
        </Link>
      </div>

      {/* Stepper visual */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-full px-3 py-2 bg-muted/60 text-foreground text-center">1. Details</div>
        <div className="rounded-full px-3 py-2 bg-muted/60 text-foreground text-center">2. Upload</div>
        <div className="rounded-full px-3 py-2 bg-[#1558E9] text-white text-center">3. Checklist</div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Return Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-12 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3">
                {defaultItems.map((i) => (
                  <label key={i.key} className="flex items-center gap-3 text-sm">
                    <Checkbox
                      checked={!!items[i.key]}
                      onCheckedChange={(v) => setItems((s) => ({ ...s, [i.key]: !!v }))}
                    />
                    {i.label}
                  </label>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link to={`/requester/reservations/upload?id=${id}`}>
                  <Button variant="outline">Back</Button>
                </Link>
                <Button
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                  onClick={finalize}
                  disabled={!allChecked}
                >
                  Finalize Reservation
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
