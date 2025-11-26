import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { statusChipClasses } from "@/components/ui/status";

import { Car, CarStatus, useCar, useCarMutations } from "@/hooks/use-cars";
import { useBranchesMap } from "@/hooks/use-branches-map";
import { toast } from "@/hooks/use-toast";

import type { Reservation } from "@/lib/http/reservations";
import { listReservationsByCar } from "@/lib/http/reservations";
import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";

const COLORS = [
  "PRETO",
  "CINZA",
  "PRATA",
  "BRANCO",
  "VERMELHO",
  "OUTRO",
] as const;

const UUID_V4 =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

function fmtDate(dt?: string | null) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleDateString("pt-BR");
  } catch {
    return dt;
  }
}

function getStatusChipKeyFromStatus(status: CarStatus): string {
  if (status === "AVAILABLE") return "Available";
  if (status === "IN_USE") return "Reserved";
  if (status === "MAINTENANCE") return "Maintenance";
  return "Unavailable";
}

// ---------- Histórico de reservas (hook) ----------

function useCarHistory(carId?: string) {
  const [history, setHistory] = useState<Reservation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!carId) {
      setHistory([]);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;

    const fetchHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);

      try {
        const rows = await listReservationsByCar(carId);
        if (cancelled) return;

        const safeRows = Array.isArray(rows) ? rows : [];
        setHistory(safeRows);
      } catch (err: any) {
        if (cancelled) return;
        console.error(err);
        const msg =
          err?.response?.data?.message ??
          "Unable to load reservation history for this vehicle.";
        setHistory([]);
        setHistoryError(msg);
            } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }

    };

    void fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [carId]);

  return { history, historyLoading, historyError };
}

// ---------- Formulário do carro (hook) ----------

type CarFormState = {
  model: string;
  plate: string;
  color: string;
  mileage: number;
  status: CarStatus;
  branchName: string;
};

interface UseCarFormArgs {
  car: Car | null | undefined;
  idToName: Record<string, string>;
  nameToId: Record<string, string>;
  update: (id: string, payload: any) => Promise<Car>;
  refresh: () => Promise<void>;
  setData: (car: Car) => void;
}

function useCarForm({
  car,
  idToName,
  nameToId,
  update,
  refresh,
  setData,
}: UseCarFormArgs) {
  const [isEditing, setEditing] = useState(false);
  const [form, setForm] = useState<CarFormState>({
    model: "",
    plate: "",
    color: "",
    mileage: 0,
    status: "AVAILABLE",
    branchName: "",
  });

  useEffect(() => {
    if (!car) return;
    setForm({
      model: car.model,
      plate: car.plate,
      color: car.color ?? "",
      mileage: car.mileage,
      status: car.status,
      branchName: idToName[car.branchId ?? ""] ?? "",
    });
  }, [car, idToName]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    void refresh();
  }, [refresh]);

  const save = useCallback(async () => {
    if (!car) return;

    try {
      const branchName = form.branchName || undefined;
      const candidateId = branchName ? nameToId[branchName] : undefined;
      const branchId =
        candidateId && UUID_V4.test(candidateId) ? candidateId : undefined;

      const updated = await update(car.id, {
        plate: form.plate.toUpperCase(),
        model: form.model,
        color: form.color || undefined,
        mileage: Number.isFinite(form.mileage) ? form.mileage : 0,
        status: form.status,
        branchName,
        ...(branchId ? { branchId } : {}),
      });

      setData(updated as Car);
      setEditing(false);
      toast({ title: "Car updated!" });
      await refresh();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Error updating car";
      toast({
        title: Array.isArray(msg) ? msg.join("\n") : msg,
        variant: "destructive",
      });
    }
  }, [car, form, nameToId, update, setData, refresh]);

  const startEditing = useCallback(() => {
    setEditing(true);
  }, []);

  return {
    isEditing,
    form,
    setForm,
    startEditing,
    cancelEditing,
    save,
  };
}

// ---------- Subcomponentes de UI ----------

interface CarInfoFormProps {
  form: CarFormState;
  setForm: React.Dispatch<React.SetStateAction<CarFormState>>;
  names: string[];
}

function CarInfoForm({ form, setForm, names }: CarInfoFormProps) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div>
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              />
            </div>
            <div>
              <Label>Plate</Label>
              <Input
                value={form.plate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    plate: e.target.value.toUpperCase().slice(0, 7),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Color</Label>
              <Select
                value={form.color || undefined}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, color: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Mileage (km)</Label>
              <Input
                value={String(form.mileage)}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D+/g, "");
                  setForm((prev) => ({
                    ...prev,
                    mileage: raw ? parseInt(raw, 10) : 0,
                  }));
                }}
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v: CarStatus) =>
                  setForm((prev) => ({ ...prev, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                  <SelectItem value="IN_USE">IN_USE</SelectItem>
                  <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                  <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Branch (by name)</Label>
              <Select
                value={form.branchName || undefined}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, branchName: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select branch" />
                </SelectTrigger>
                <SelectContent>
                  {names.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CarInfoViewProps {
  car: Car;
  idToName: Record<string, string>;
}

function CarInfoView({ car, idToName }: CarInfoViewProps) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div>
              <Label>Model</Label>
              <p className="text-foreground font-medium">{car.model}</p>
            </div>
            <div>
              <Label>Plate</Label>
              <p className="text-foreground">{car.plate}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Color</Label>
              <p className="text-foreground">{car.color ?? "-"}</p>
            </div>
            <div>
              <Label>Mileage (km)</Label>
              <p className="text-foreground">
                {car.mileage.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <Label>Status</Label>
              <Badge
                className={statusChipClasses(
                  getStatusChipKeyFromStatus(car.status),
                )}
              >
                {car.status}
              </Badge>
            </div>

            <div>
              <Label>Branch (by name)</Label>
              <p className="text-foreground">
                {idToName[car.branchId ?? ""] ?? "-"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface CarHistoryCardProps {
  history: Reservation[];
  historyLoading: boolean;
  historyError: string | null;
}

function CarHistoryCard({
  history,
  historyLoading,
  historyError,
}: CarHistoryCardProps) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-[#1558E9]">
            Reservation History
          </h2>
        </div>

        {historyLoading ? (
          <p className="text-sm text-muted-foreground">
            Loading reservation history…
          </p>
        ) : history.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No reservations for this vehicle.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2 px-2 text-muted-foreground">
                    RESERVATION
                  </th>
                  <th className="text-left py-2 px-2 text-muted-foreground">
                    USER
                  </th>
                  <th className="text-left py-2 px-2 text-muted-foreground">
                    START DATE
                  </th>
                  <th className="text-left py-2 px-2 text-muted-foreground">
                    END DATE
                  </th>
                </tr>
              </thead>
              <tbody>
                {history
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.startAt).getTime() -
                      new Date(a.startAt).getTime(),
                  )
                  .map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/30 last:border-0"
                    >
                      <td className="py-2 px-2 font-medium text-foreground">
                        {makeFriendlyReservationCode({
                          id: r.id,
                          code: (r as any).code ?? null,
                        })}
                      </td>
                      <td className="py-2 px-2 text-foreground">
                        {r.user?.name ?? r.user?.email ?? "—"}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {fmtDate(r.startAt)}
                      </td>
                      <td className="py-2 px-2 text-muted-foreground">
                        {fmtDate(r.endAt)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {historyError && !historyLoading && (
          <p className="mt-3 text-xs text-red-600">{historyError}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Página principal ----------

export default function CarDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: car, refresh, setData } = useCar(id);
  const { update } = useCarMutations();

  const { map } = useBranchesMap();

  const idToName = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(map).map(([bid, b]: [string, any]) => [
          bid,
          (b?.name as string) ?? "",
        ]),
      ) as Record<string, string>,
    [map],
  );

  const names = useMemo(
    () =>
      Object.values(map)
        .map((b: any) => b?.name)
        .filter(Boolean) as string[],
    [map],
  );

  const nameToId = useMemo(
    () =>
      Object.fromEntries(
        Object.values(map).map((b: any) => [
          (b?.name as string) ?? "",
          (b?.id as string) ?? "",
        ]),
      ) as Record<string, string>,
    [map],
  );

  const {
    isEditing,
    form,
    setForm,
    startEditing,
    cancelEditing,
    save,
  } = useCarForm({
    car,
    idToName,
    nameToId,
    update,
    refresh,
    setData,
  });

  const { history, historyLoading, historyError } = useCarHistory(car?.id);

  if (!car) {
    return (
      <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
        <div className="space-y-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="hover:bg-card/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-8">
              <p className="text-muted-foreground">Vehicle not found.</p>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="hover:bg-card/50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Car Information
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button
                variant="outline"
                onClick={startEditing}
                className="border-border/50"
              >
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={cancelEditing}
                  className="border-border/50"
                >
                  Cancel
                </Button>
                <Button
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                  onClick={save}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        {isEditing ? (
          <CarInfoForm form={form} setForm={setForm} names={names} />
        ) : (
          <CarInfoView car={car} idToName={idToName} />
        )}

        {/* Histórico de reservas do carro */}
        <CarHistoryCard
          history={history}
          historyLoading={historyLoading}
          historyError={historyError}
        />
      </div>
    </RoleGuard>
  );
}
