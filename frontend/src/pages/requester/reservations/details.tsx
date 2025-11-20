import * as React from "react";
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusChipClasses } from "@/components/ui/status";
import {
  Loader2,
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

import useReservations from "@/hooks/use-reservations";
import type { Reservation } from "@/lib/http/reservations";
import {
  ChecklistsAPI,
  type ChecklistSubmission,
} from "@/lib/http/checklists";

function normalizeDecision(source: any): "APPROVED" | "REJECTED" | null {
  if (!source) return null;

  const raw =
    source.decision ??
    source.result ??
    source.status ??
    source.payload?.decision ??
    source.payload?.result ??
    source.payload?.status ??
    null;

  if (!raw || typeof raw !== "string") return null;
  const s = raw.toUpperCase();
  if (s === "APPROVED" || s === "VALIDATED") return "APPROVED";
  if (s === "REJECTED") return "REJECTED";
  return null;
}

export default function RequesterReservationDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReservation } = useReservations();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [checklistDecision, setChecklistDecision] = useState<
    "APPROVED" | "REJECTED" | null
  >(null);
  const [checklistNotes, setChecklistNotes] = useState<string | null>(null);
  const [loadingChecklistInfo, setLoadingChecklistInfo] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

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

  // Carrega info de checklist (decisão + notas) quando COMPLETED
  useEffect(() => {
    if (!reservation || reservation.status !== "COMPLETED") {
      setChecklistDecision(null);
      setChecklistNotes(null);
      setChecklistError(null);
      setLoadingChecklistInfo(false);
      return;
    }

    let cancelled = false;

    const loadChecklistInfo = async () => {
      setLoadingChecklistInfo(true);
      setChecklistError(null);

      try {
        const subs = await ChecklistsAPI.listReservationSubmissions(
          reservation.id,
        );

        const validations = subs.filter(
          (s) => s.kind === "APPROVER_VALIDATION",
        );

        if (!validations.length) {
          if (!cancelled) {
            setChecklistDecision(null);
            setChecklistNotes(null);
          }
          return;
        }

        const latest = validations.reduce((best, curr) => {
          const tb = new Date(best.createdAt).getTime();
          const tc = new Date(curr.createdAt).getTime();
          return tc > tb ? curr : best;
        });

        const decision = normalizeDecision(latest as any);

        let notes: string | null = null;
        const payload: any = latest.payload ?? {};
        if (typeof payload.notes === "string" && payload.notes.trim().length > 0) {
          notes = payload.notes;
        }

        if (!cancelled) {
          setChecklistDecision(decision);
          setChecklistNotes(notes);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setChecklistError(
            e?.response?.data?.message ||
              e?.message ||
              "Não foi possível carregar os dados do checklist.",
          );
          setChecklistDecision(null);
          setChecklistNotes(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingChecklistInfo(false);
        }
      }
    };

    void loadChecklistInfo();

    return () => {
      cancelled = true;
    };
  }, [reservation]);

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

              {/* Info de checklist quando COMPLETED */}
              {reservation.status === "COMPLETED" && (
                <div className="mt-2 space-y-2">
                  {loadingChecklistInfo ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Loading checklist information…
                    </div>
                  ) : checklistError ? (
                    <div className="flex items-start gap-2 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 h-3 w-3" />
                      <span>{checklistError}</span>
                    </div>
                  ) : checklistDecision === "REJECTED" ? (
                    <div className="rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-700 space-y-1">
                      <div className="flex items-center gap-1 font-semibold">
                        <AlertCircle className="h-3 w-3" />
                        <span>Checklist rejeitado.</span>
                      </div>
                      {checklistNotes && (
                        <p>
                          Motivo informado pelo aprovador:{" "}
                          <span className="font-medium">
                            {checklistNotes}
                          </span>
                        </p>
                      )}
                      <p>
                        O administrador da unidade entrará em contato para
                        regularização.
                      </p>
                    </div>
                  ) : checklistDecision === "APPROVED" && checklistNotes ? (
                    <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 space-y-1">
                      <div className="flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Checklist aprovado.</span>
                      </div>
                      <p>
                        Observação do aprovador:{" "}
                        <span className="font-medium">
                          {checklistNotes}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Ações de conclusão */}
              <div className="pt-4 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  To conclude this trip, upload the required documents and
                  complete the checklist.
                </p>

                {canConclude ? (
                  <Link to={`/requester/reservations/${reservation.id}/upload`}>
                    <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Continue to Upload
                    </Button>
                  </Link>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Only <strong>APPROVED</strong> reservations can be
                    concluded.
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
