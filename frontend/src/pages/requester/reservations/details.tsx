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

function mapReservationStatusToChip(status: Reservation["status"]) {
  if (status === "PENDING") return "Warning";
  if (status === "APPROVED") return "Active";
  if (status === "COMPLETED") return "Success";
  return "Inactive";
}

type Decision = "APPROVED" | "REJECTED" | null;

interface UseReservationDetailsResult {
  reservation: Reservation | null;
  loading: boolean;
  error: string | null;
}

function useReservationDetails(
  id: string,
  getReservation: (id: string) => Promise<Reservation | null | undefined>,
): UseReservationDetailsResult {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Invalid reservation id.");
      setReservation(null);
      setLoading(false);
      return;
    }

    let mounted = true;

    const loadReservation = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await getReservation(id);
        if (mounted) {
          setReservation((data as Reservation) ?? null);
        }
      } catch (e: any) {
        if (mounted) {
          setError(
            e?.response?.data?.message ||
              e?.message ||
              "Unable to load reservation.",
          );
          setReservation(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadReservation();

    return () => {
      mounted = false;
    };
  }, [id, getReservation]);

  return { reservation, loading, error };
}

interface ChecklistInfo {
  decision: Decision;
  notes: string | null;
  loading: boolean;
  error: string | null;
}

function useChecklistInfo(reservation: Reservation | null): ChecklistInfo {
  const [decision, setDecision] = useState<Decision>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservation || reservation.status !== "COMPLETED") {
      setDecision(null);
      setNotes(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadChecklistInfo = async () => {
      setLoading(true);
      setError(null);

      try {
        const subs: ChecklistSubmission[] =
          await ChecklistsAPI.listReservationSubmissions(reservation.id);

        const validations = subs.filter(
          (s) => s.kind === "APPROVER_VALIDATION",
        );

        if (!validations.length) {
          if (!cancelled) {
            setDecision(null);
            setNotes(null);
          }
          return;
        }

        const latest = validations.reduce((best, curr) => {
          const tb = new Date(best.createdAt).getTime();
          const tc = new Date(curr.createdAt).getTime();
          return tc > tb ? curr : best;
        });

        const latestDecision = normalizeDecision(latest as any);

        let latestNotes: string | null = null;
        const payload: any = latest.payload ?? {};
        if (
          typeof payload.notes === "string" &&
          payload.notes.trim().length > 0
        ) {
          latestNotes = payload.notes;
        }

        if (!cancelled) {
          setDecision(latestDecision);
          setNotes(latestNotes);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) {
          setError(
            e?.response?.data?.message ||
              e?.message ||
              "Não foi possível carregar os dados do checklist.",
          );
          setDecision(null);
          setNotes(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadChecklistInfo();

    return () => {
      cancelled = true;
    };
  }, [reservation]);

  return {
    decision,
    notes,
    loading,
    error,
  };
}

function ReservationMainInfo({ reservation }: { reservation: Reservation }) {
  return (
    <div className="grid grid-cols-1 gap-6 text-sm md:grid-cols-2">
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Origin</p>
        <p className="font-medium text-foreground">{reservation.origin}</p>
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
  );
}

interface ChecklistInfoSectionProps {
  reservation: Reservation;
  checklistDecision: Decision;
  checklistNotes: string | null;
  loadingChecklistInfo: boolean;
  checklistError: string | null;
}

function ChecklistInfoSection({
  reservation,
  checklistDecision,
  checklistNotes,
  loadingChecklistInfo,
  checklistError,
}: ChecklistInfoSectionProps) {
  if (reservation.status !== "COMPLETED") return null;

  return (
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
        <div className="space-y-1 rounded-md border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-700">
          <div className="flex items-center gap-1 font-semibold">
            <AlertCircle className="h-3 w-3" />
            <span>Checklist rejeitado.</span>
          </div>
          {checklistNotes && (
            <p>
              Motivo informado pelo aprovador:{" "}
              <span className="font-medium">{checklistNotes}</span>
            </p>
          )}
          <p>
            O administrador da unidade entrará em contato para
            regularização.
          </p>
        </div>
      ) : checklistDecision === "APPROVED" && checklistNotes ? (
        <div className="space-y-1 rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700">
          <div className="flex items-center gap-1 font-semibold">
            <CheckCircle2 className="h-3 w-3" />
            <span>Checklist aprovado.</span>
          </div>
          <p>
            Observação do aprovador:{" "}
            <span className="font-medium">{checklistNotes}</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReservationActions({
  reservation,
}: {
  reservation: Reservation;
}) {
  const canConclude = reservation.status === "APPROVED";

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs text-muted-foreground">
        To conclude this trip, upload the required documents and complete
        the checklist.
      </p>

      {canConclude ? (
        <Link to={`/requester/reservations/${reservation.id}/upload`}>
          <Button className="flex items-center gap-2 bg-[#1558E9] hover:bg-[#1558E9]/90">
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
  );
}

interface ReservationDetailsContentProps {
  reservation: Reservation | null;
  loading: boolean;
  error: string | null;
  checklistDecision: Decision;
  checklistNotes: string | null;
  loadingChecklistInfo: boolean;
  checklistError: string | null;
}

function ReservationDetailsContent({
  reservation,
  loading,
  error,
  checklistDecision,
  checklistNotes,
  loadingChecklistInfo,
  checklistError,
}: ReservationDetailsContentProps) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!reservation) {
    return (
      <p className="text-sm text-muted-foreground">
        Reservation not found.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <ReservationMainInfo reservation={reservation} />

      <ChecklistInfoSection
        reservation={reservation}
        checklistDecision={checklistDecision}
        checklistNotes={checklistNotes}
        loadingChecklistInfo={loadingChecklistInfo}
        checklistError={checklistError}
      />

      <ReservationActions reservation={reservation} />
    </div>
  );
}

export default function RequesterReservationDetailsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getReservation } = useReservations();

  const { reservation, loading, error } = useReservationDetails(
    id,
    getReservation,
  );

  const {
    decision: checklistDecision,
    notes: checklistNotes,
    loading: loadingChecklistInfo,
    error: checklistError,
  } = useChecklistInfo(reservation);

  const handleBack = () => {
    navigate(-1);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
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
                mapReservationStatusToChip(reservation.status),
              )}
            >
              {reservation.status}
            </Badge>
          )}
        </CardHeader>

        <CardContent>
          <ReservationDetailsContent
            reservation={reservation}
            loading={loading}
            error={error}
            checklistDecision={checklistDecision}
            checklistNotes={checklistNotes}
            loadingChecklistInfo={loadingChecklistInfo}
            checklistError={checklistError}
          />
        </CardContent>
      </Card>
    </div>
  );
}
