import * as React from "react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import useReservations from "@/hooks/use-reservations";
import { useToast } from "@/components/ui/use-toast";

// mesma leitura da chave usada em Gas Stations
const MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_EMBED_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  "";

function toISO(localDateTime: string) {
  return new Date(localDateTime).toISOString();
}
function diffHuman(start?: string, end?: string) {
  if (!start || !end) return "—";
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return "—";
  const h = Math.floor((b - a) / 36e5),
    d = Math.floor(h / 24),
    hh = h % 24;
  return d > 0
    ? `${d} day${d > 1 ? "s" : ""} ${hh} hour${hh !== 1 ? "s" : ""}`
    : `${h} hour${h !== 1 ? "s" : ""}`;
}
function nowInputLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

// evita "any" no payload de criação
type CreateReservationPayload = {
  origin: string;
  destination: string;
  startAt: string;
  endAt: string;
  purpose?: string;
  notes?: string;
  passengers?: number;
};

export default function NewReservationPage() {
  const navigate = useNavigate();
  const { createReservation, loading, errors } = useReservations();
  const { toast } = useToast();

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startAtLocal, setStartAtLocal] = useState("");
  const [endAtLocal, setEndAtLocal] = useState("");

  const [passengers, setPassengers] = useState("1");
  const [purpose, setPurpose] = useState("Project");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = useMemo(() => {
    const a = origin.trim(),
      b = destination.trim();
    if (!a || !b || !startAtLocal || !endAtLocal) return false;
    const s = Date.parse(startAtLocal);
    const e = Date.parse(endAtLocal);
    if (Number.isNaN(s) || Number.isNaN(e)) return false;
    return s < e;
  }, [origin, destination, startAtLocal, endAtLocal]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!valid) {
      setFormError(
        "Preencha os campos e garanta que o início é no futuro e antes do fim.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload: CreateReservationPayload = {
        origin: origin.trim(),
        destination: destination.trim(),
        startAt: toISO(startAtLocal),
        endAt: toISO(endAtLocal),
        purpose,
        notes: notes?.trim() || undefined,
        passengers: Number(passengers),
      };

      const result = await createReservation(payload);

      if (!result.ok) {
        setFormError(errors.create || "Não foi possível criar a reserva.");
        return;
      }

      toast({
        title: "Reservation created",
        description: "Your request was sent for approval.",
      });

      navigate("/requester/reservations");
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.message ||
        (err as Error)?.message ||
        "Falha ao enviar a solicitação.";
      setFormError(
        typeof msg === "string" ? msg : "Falha ao enviar a solicitação.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const minStart = nowInputLocal();
  const minEnd = startAtLocal || minStart;

  const startISO = startAtLocal ? toISO(startAtLocal) : undefined;
  const endISO = endAtLocal ? toISO(endAtLocal) : undefined;
  const pickupReturn =
    origin && destination ? `${origin} → ${destination}` : "—";

  // --------- MAPA (mesma lógica da tela de Gas Stations) ---------
  const mapsApiKey = MAPS_API_KEY;
  const hasOrigin = origin.trim().length > 0;
  const hasDestination = destination.trim().length > 0;
  const hasRoute = hasOrigin && hasDestination;

  const embedUrl = useMemo(() => {
    if (!mapsApiKey || !hasRoute) return null;
    return `https://www.google.com/maps/embed/v1/directions?key=${mapsApiKey}&origin=${encodeURIComponent(
      origin.trim(),
    )}&destination=${encodeURIComponent(destination.trim())}`;
  }, [mapsApiKey, hasRoute, origin, destination]);

  const handleOpenRouteInMaps = () => {
    if (!hasRoute) return;
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin.trim(),
    )}&destination=${encodeURIComponent(destination.trim())}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="mx-auto max-w-[1400px] p-6">
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="space-y-6 lg:col-span-2">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>New Reservation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Trip Details */}
              <section className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Trip Details
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Origin</Label>
                    <Input
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      placeholder="Type origin"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Destination</Label>
                    <Input
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="Type destination"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departure</Label>
                    <Input
                      type="datetime-local"
                      min={minStart}
                      value={startAtLocal}
                      onChange={(e) => setStartAtLocal(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Return</Label>
                    <Input
                      type="datetime-local"
                      min={minEnd}
                      value={endAtLocal}
                      onChange={(e) => setEndAtLocal(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Passengers</Label>
                    <Select value={passengers} onValueChange={setPassengers}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Purpose</Label>
                    <Select value={purpose} onValueChange={setPurpose}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Project">Project</SelectItem>
                        <SelectItem value="Client Visit">
                          Client Visit
                        </SelectItem>
                        <SelectItem value="Others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any additional information…"
                      className="min-h-[96px]"
                    />
                  </div>
                </div>
              </section>

              {/* Route Preview - agora igual ao Gas Stations */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Route preview (origin/destination da reserva)
                  </h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={handleOpenRouteInMaps}
                    disabled={!hasRoute}
                  >
                    Abrir rota no Google Maps
                  </Button>
                </div>
                <div className="relative h-72 overflow-hidden rounded-md border border-border/50 bg-card">
                  {!hasRoute ? (
                    <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                      Informe origem e destino para visualizar aqui a prévia da
                      rota no mapa.
                    </div>
                  ) : embedUrl ? (
                    <iframe
                      title="Route map"
                      className="h-full w-full border-0"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={embedUrl}
                    />
                  ) : (
                    <>
                      <img
                        src="/gas-station.png"
                        alt="Route map"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute left-4 top-4 rounded bg-card p-2 text-xs shadow-sm">
                        A visualização em mapa requer uma chave válida do
                        Google Maps.
                      </div>
                    </>
                  )}
                </div>
              </section>

              {(formError || errors.create) && (
                <p className="text-sm text-red-600">
                  {formError || errors.create}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={!valid || loading.create || submitting}
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                >
                  {loading.create || submitting ? "Sending…" : "Submit Request"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/requester/reservations")}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Estimated Duration
                </span>
                <span className="text-foreground">
                  {diffHuman(startISO, endISO)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pickup/Return</span>
                <span className="text-right text-foreground">
                  {pickupReturn}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Approver</span>
                <span className="text-foreground">Assigned automatically</span>
              </div>
              <Button
                type="submit"
                className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90"
                disabled={!valid || loading.create || submitting}
              >
                {loading.create || submitting ? "Sending…" : "Submit Request"}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </form>
    </div>
  );
}
