// frontend/src/pages/requester/reservations/upload.tsx
import * as React from "react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

import useReservations from "@/hooks/use-reservations";

function useQuery() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

export default function RequesterReservationUpload() {
  const q = useQuery();
  const id = q.get("id") || "";
  const navigate = useNavigate();
  const { getReservation } = useReservations();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await getReservation(id); // garante que a reserva existe
        if (mounted) setLoading(false);
      } catch (e: any) {
        if (mounted) {
          setErr(e?.response?.data?.message || e?.message || "Unable to load reservation.");
          setLoading(false);
        }
      }
    })();
    return () => { mounted = false; };
  }, [id, getReservation]);

  return (
    <div className="mx-auto p-6 max-w-[900px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Conclude Reservation</h1>
          <p className="text-sm text-muted-foreground">Step 2 of 3 — Upload your documents.</p>
        </div>
        <Link to={`/requester/reservations/details?id=${id}`}>
          <Button variant="ghost">Back to Details</Button>
        </Link>
      </div>

      {/* Stepper visual simples */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-full px-3 py-2 bg-muted/60 text-foreground text-center">1. Details</div>
        <div className="rounded-full px-3 py-2 bg-[#1558E9] text-white text-center">2. Upload</div>
        <div className="rounded-full px-3 py-2 bg-muted/60 text-foreground text-center">3. Checklist</div>
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
              {/* Somente UI (sem integração de upload por enquanto) */}
              <div className="space-y-2">
                <Label>Driver's license (CNH)</Label>
                <Input type="file" accept="image/*,application/pdf" />
              </div>
              <div className="space-y-2">
                <Label>Receipts</Label>
                <Input type="file" multiple accept="image/*,application/pdf" />
              </div>
              <div className="space-y-2">
                <Label>Photos</Label>
                <Input type="file" multiple accept="image/*" />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Link to={`/requester/reservations/details?id=${id}`}>
                  <Button variant="outline">Back</Button>
                </Link>
                <Button
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                  onClick={() => navigate(`/requester/reservations/checklist?id=${id}`)}
                >
                  Continue to Checklist
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
