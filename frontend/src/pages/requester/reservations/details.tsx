import * as React from "react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Car, MapPin, Clock } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusChipClasses } from "@/components/ui/status";

type ReservStatus =
  | "Solicitado"
  | "Enviado p/ aprovação"
  | "Aprovado"
  | "Em Progresso"
  | "Concluída"
  | "Rejeitado"
  | "Cancelada";

type Reservation = {
  id: string;
  userName?: string;
  userEmail?: string;
  branch?: string;     // Filial
  origin?: string;     // Cidade/Origem
  carModel: string;
  plate: string;
  startISO: string;    // início (ISO)
  endISO: string;      // fim (ISO)
  status: ReservStatus;
};

const LS_KEY = "reservcar:req:reservations";

/* ---------- helpers ---------- */
function loadOne(id: string): Reservation | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const list = JSON.parse(raw) as Reservation[];
    return list.find((r) => r.id === id) ?? null;
  } catch {
    return null;
  }
}
function fmt(dt: string) {
  const d = new Date(dt);
  return d.toLocaleString();
}
function pickupMinus30(startISO: string) {
  const d = new Date(startISO);
  d.setMinutes(d.getMinutes() - 30);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StepPill({
  label,
  active,
}: {
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm transition border ${
        active
          ? "bg-[#0B2FA8]/10 border-[#1558E9]/40"
          : "bg-transparent border-border/50"
      }`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          active ? "bg-[#1558E9]" : "bg-muted-foreground/40"
        }`}
      />
      <span className={active ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
    </div>
  );
}

/* ---------- page ---------- */
export default function RequesterReservationDetails() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const data = loadOne(id);

  const steps: ReservStatus[] = useMemo(
    () => [
      "Solicitado",
      "Enviado p/ aprovação",
      "Aprovado",
      "Em Progresso",
      "Concluída",
    ],
    [],
  );

  const currentIndex = useMemo(() => {
    if (!data) return -1;
    const i = steps.indexOf(data.status);
    return i === -1 ? 0 : i;
  }, [data, steps]);

  if (!data) {
    return (
      <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
        <div className="p-6">
          <p className="text-sm text-muted-foreground">
            Reservation not found.
          </p>
        </div>
      </RoleGuard>
    );
  }

  const isBlockedToFinalize =
    data.status === "Rejeitado" ||
    data.status === "Cancelada" ||
    data.status === "Concluída";

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Título + status */}
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            Reservation #{data.id}
          </h1>
          <Badge className={statusChipClasses(data.status as any)}>
            {data.status}
          </Badge>
        </div>

        {/* Barra de etapas */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {steps.map((label, idx) => (
                <StepPill key={label} label={label} active={idx <= currentIndex} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Resumo completo */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-foreground">Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Usuário */}
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">User</div>
              <div className="text-foreground font-medium">
                {data.userName ?? "—"}
              </div>
              <div className="text-sm text-muted-foreground">
                {data.userEmail ?? "—"}
              </div>
            </div>

            {/* Veículo */}
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Vehicle</div>
              <div className="flex items-center gap-2 text-foreground">
                <Car className="h-4 w-4" />
                <span className="font-medium">
                  {data.carModel} — {data.plate}
                </span>
              </div>
            </div>

            {/* Filial / Origem */}
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Filial</div>
              <div className="flex items-center gap-2 text-foreground">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">{data.branch ?? "—"}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Origin: {data.origin ?? "—"}
              </div>
            </div>

            {/* Datas */}
            <div className="space-y-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Start</div>
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-medium">{fmt(data.startISO)}</span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Pickup time: {pickupMinus30(data.startISO)}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">End</div>
                <div className="flex items-center gap-2 text-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span className="font-medium">{fmt(data.endISO)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA principal — aparece somente quando permitido */}
        {!isBlockedToFinalize && (
          <Button
            className="bg-[#1558E9] hover:bg-[#1558E9]/90"
            onClick={() => navigate(`/requester/reservations/${data.id}/upload`)}
          >
            Finalize Reservation → Upload Documents
          </Button>
        )}
      </div>
    </RoleGuard>
  );
}
