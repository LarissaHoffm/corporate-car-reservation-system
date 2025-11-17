import * as React from "react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusChipClasses } from "@/components/ui/status";
import { Loader2, ArrowLeft, Printer, CheckCircle2 } from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import type { Reservation } from "@/lib/http/reservations";

export default function RequesterReservationDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReservation } = useReservations();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setErr("Invalid reservation id.");
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const data = await getReservation(id);
        if (mounted) {
          setReservation(data as Reservation);
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

  function handleBack() {
    navigate(-1);
  }

  function handlePrint() {
    window.print();
  }

  const canConclude = reservation && reservation.status === "APPROVED";

  return (
    <div className="mx-auto max-w-[1400px] p-6 space-y-6">
      {/* Top bar: Back + Print */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Reservation Details</CardTitle>

          {reservation && (
            <Badge
              className={statusChipClasses(
                reservation.status === "PENDING"
                  ? "Warning"
                  : reservation.status === "APPROVED"
                    ? "Active"
                    : reservation.status === "COMPLETED"
                      ? "Success"
                      : "Inactive",
              )}
            >
              {reservation.status}
            </Badge>
          )}
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : err ? (
            <p className="text-sm text-red-600">{err}</p>
          ) : reservation ? (
            <div className="space-y-6">
              {/* Dados principais */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Origin</p>
                  <p className="font-medium text-foreground">
                    {reservation.origin}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="font-medium text-foreground">
                    {reservation.destination}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p className="font-medium text-foreground">
                    {new Date(reservation.startAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">End</p>
                  <p className="font-medium text-foreground">
                    {new Date(reservation.endAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="space-y-1 md:col-span-2">
                  <p className="text-xs text-muted-foreground">Car</p>
                  <p className="font-medium text-foreground">
                    {reservation.car
                      ? `${reservation.car.plate} — ${reservation.car.model}`
                      : "Not assigned"}
                  </p>
                </div>
              </div>

              {/* Ações de conclusão */}
              <div className="pt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  To conclude this trip, upload the required documents and
                  complete the checklist.
                </p>

                {canConclude ? (
                  <Link
                    to={`/requester/reservations/${reservation.id}/upload`}
                  >
                    <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Continue to Upload
                    </Button>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Only <strong>APPROVED</strong> reservations can be concluded.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Reservation not found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
