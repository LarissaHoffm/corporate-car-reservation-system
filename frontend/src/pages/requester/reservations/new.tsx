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

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startAtLocal, setStartAtLocal] = useState("");
  const [endAtLocal, setEndAtLocal] = useState("");

  const [passengers, setPassengers] = useState("1");
  const [purpose, setPurpose] = useState("Project");
  const [prefTransmission, setPrefTransmission] = useState("Automatic");
  const [prefFuel, setPrefFuel] = useState("Any");
  const [prefClass, setPrefClass] = useState("Compact");
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
    return s < e && s > Date.now();
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

      // cria a solicitação (sem atribuição de carro aqui)
      const result = await createReservation(payload);

      // OpResult não possui 'error' → usar erros do hook ou mensagem genérica
      if (!result.ok) {
        setFormError(errors.create || "Não foi possível criar a reserva.");
        return;
      }
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

  return (
    <div className="mx-auto p-6 max-w-[1400px]">
      <form
        onSubmit={onSubmit}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        <div className="lg:col-span-2 space-y-6">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Route Preview */}
              <section className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Route Preview
                </h3>
                <div className="h-40 rounded-md border border-dashed border-border/50 grid place-items-center text-sm text-muted-foreground">
                  Route will be displayed here
                </div>
              </section>

              {/* Vehicle Preferences (visual) */}
              <section className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Vehicle Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Transmission</Label>
                    <Select
                      value={prefTransmission}
                      onValueChange={setPrefTransmission}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Automatic">Automatic</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Fuel</Label>
                    <Select value={prefFuel} onValueChange={setPrefFuel}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                        <SelectItem value="Any">Any</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class</Label>
                    <Select value={prefClass} onValueChange={setPrefClass}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sedan">Sedan</SelectItem>
                        <SelectItem value="Compact">Compact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {(formError || errors.create) && (
                <p className="text-sm text-red-600">
                  {formError || errors.create}
                </p>
              )}

              <div className="pt-2 flex gap-2">
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
                  onClick={() => navigate(-1)}
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
