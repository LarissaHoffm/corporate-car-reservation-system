import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { statusChipClasses } from "@/components/ui/status";

import {
  ReservationsAPI,
  type Reservation as ApiReservation,
} from "@/lib/http/reservations";
import type { Station as ApiStation } from "@/lib/http/stations";
import { makeFriendlyReservationCode } from "@/lib/friendly-reservation-code";

// ==================== CONSTS / TIPOS ====================

type UiReservationStatus = "Active" | "Confirmed" | "Pending";

type UiReservation = {
  id: string;
  carLabel: string;
  plate: string;
  date1: string;
  date2: string;
  status: UiReservationStatus;
  origin: string;
  destination: string;
};

type Fuel = "Petrol" | "Diesel" | "EV";
type Brand = "shell" | "bp" | "independent";

type UiStationStatus = "Active" | "Inactive";

type UiStation = {
  id: string;
  name: string;
  location: string;
  brand: Brand;
  fuels: Fuel[];
  status: UiStationStatus;
  raw: ApiStation;
};

// Lemos a chave do Maps direto do Vite (build-time)
const MAPS_API_KEY =
  (import.meta as any).env?.VITE_GOOGLE_MAPS_EMBED_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY ||
  "";

// ==================== HELPERS ====================

function formatDate(dateIso: string): string {
  if (!dateIso) return "";
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return "";
  const opts: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "2-digit",
  };
  return d.toLocaleDateString(undefined, opts);
}

function mapReservationToUi(r: ApiReservation): UiReservation {
  let status: UiReservationStatus = "Pending";
  if (r.status === "APPROVED") status = "Active";
  else if (r.status === "COMPLETED") status = "Confirmed";

  return {
    id: r.id,
    carLabel: r.car?.model ?? "Unassigned",
    plate: r.car?.plate ?? "-",
    date1: formatDate(r.startAt),
    date2: formatDate(r.endAt),
    status,
    origin: r.origin,
    destination: r.destination,
  };
}

function mapStationToUi(s: ApiStation): UiStation {
  return {
    id: s.id,
    name: s.name,
    location: s.address ?? "Endereço não informado",
    // Para o MVP do RF19, usamos valores genéricos de brand/fuel.
    brand: "independent",
    fuels: ["Petrol"],
    status: s.isActive === false ? "Inactive" : "Active",
    raw: s,
  };
}

function chipForReservation(
  s: UiReservationStatus,
): "Pendente" | "Aprovado" | "Rejeitado" {
  // Active/Confirmed => Aprovado (verde), Pending => Pendente (âmbar)
  if (s === "Pending") return "Pendente";
  return "Aprovado";
}

function chipForStation(
  s: UiStationStatus,
): "Pendente" | "Aprovado" | "Rejeitado" {
  // Active => Aprovado (verde), Inactive => Rejeitado (vermelho)
  return s === "Active" ? "Aprovado" : "Rejeitado";
}

// ==================== PAGE ====================

export default function GasStationsPage() {
  // dados da API
  const [reservations, setReservations] = useState<UiReservation[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<
    string | undefined
  >(undefined);
  const [stations, setStations] = useState<UiStation[]>([]);

  // estados auxiliares
  const [loadingReservations, setLoadingReservations] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros das estações
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<"all" | Brand>("all");
  const [selectedFuel, setSelectedFuel] = useState<"all" | Fuel>("all");

  // carregar reservas do requester (filtrando APPROVED + PENDING no front)
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoadingReservations(true);
        setError(null);
        // não mandamos "status" para o back, filtramos aqui
        const data = await ReservationsAPI.listMine({
          pageSize: 100,
        });

        if (!isMounted) return;

        const filtered = (data ?? []).filter(
          (r) => r.status === "APPROVED" || r.status === "PENDING",
        );

        const ui = filtered.map(mapReservationToUi);
        setReservations(ui);

        if (ui.length > 0) {
          if (
            !selectedReservationId ||
            !ui.some((r) => r.id === selectedReservationId)
          ) {
            setSelectedReservationId(ui[0].id);
          }
        } else {
          setSelectedReservationId(undefined);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error(err);
        setError(
          err?.userMessage ||
            "Erro ao carregar reservas do usuário autenticado.",
        );
      } finally {
        if (isMounted) setLoadingReservations(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
    
  }, []);

  const selectedReservation = useMemo(
    () =>
      reservations.find((r) => r.id === selectedReservationId) ??
      reservations[0],
    [reservations, selectedReservationId],
  );

  // carregar postos da reserva selecionada
  useEffect(() => {
    if (!selectedReservationId) {
      setStations([]);
      return;
    }

    let isMounted = true;
    const loadStations = async () => {
      try {
        setLoadingStations(true);
        setError(null);
        const data = await ReservationsAPI.getStationsOnRoute(
          selectedReservationId,
        );
        if (!isMounted) return;
        const ui = (data ?? []).map(mapStationToUi);
        setStations(ui);
      } catch (err: any) {
        if (!isMounted) return;
        console.error(err);
        setError(
          err?.userMessage || "Erro ao carregar postos no trajeto da reserva.",
        );
        setStations([]);
      } finally {
        if (isMounted) setLoadingStations(false);
      }
    };
    loadStations();
    return () => {
      isMounted = false;
    };
  }, [selectedReservationId]);

  // opções dinâmicas para filtros (derivadas dos postos da API)
  const brandOptions = useMemo<("all" | Brand)[]>(() => {
    const set = new Set<Brand>();
    stations.forEach((s) => set.add(s.brand));
    return ["all", ...Array.from(set)];
  }, [stations]);

  const fuelOptions = useMemo<("all" | Fuel)[]>(() => {
    const set = new Set<Fuel>();
    stations.forEach((s) => s.fuels.forEach((f) => set.add(f)));
    return ["all", ...Array.from(set)];
  }, [stations]);

  // filtro aplicado
  const filteredStations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return stations.filter((s) => {
      const byQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q);
      const byBrand = selectedBrand === "all" || s.brand === selectedBrand;
      const byFuel = selectedFuel === "all" || s.fuels.includes(selectedFuel);
      return byQuery && byBrand && byFuel;
    });
  }, [stations, searchTerm, selectedBrand, selectedFuel]);

  // Google Maps (embed + botão)
  const mapsApiKey = MAPS_API_KEY;
  const hasRoute =
    !!selectedReservation?.origin && !!selectedReservation?.destination;

  const embedUrl =
    mapsApiKey && hasRoute
      ? `https://www.google.com/maps/embed/v1/directions?key=${mapsApiKey}&origin=${encodeURIComponent(
          selectedReservation!.origin,
        )}&destination=${encodeURIComponent(selectedReservation!.destination)}`
      : null;

  const handleOpenRouteInMaps = () => {
    if (!selectedReservation) return;
    const origin = selectedReservation.origin?.trim();
    const destination = selectedReservation.destination?.trim();
    if (!origin || !destination) return;

    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
      origin,
    )}&destination=${encodeURIComponent(destination)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenStationInMaps = (station: UiStation) => {
    const address =
      station.raw?.address || station.location || station.name;
    if (!address) return;

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Gas Stations on Route
          </h1>
        </div>

        {/* Reservation Info */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-muted-foreground">
                  Select Reservation:
                </span>
                <Select
                  value={selectedReservation?.id ?? undefined}
                  onValueChange={setSelectedReservationId}
                  disabled={loadingReservations || reservations.length === 0}
                >
                  <SelectTrigger className="w-56 border-border/50">
                    <SelectValue
                      placeholder={
                        loadingReservations
                          ? "Loading..."
                          : "Select a reservation"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {reservations.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {makeFriendlyReservationCode(r.id)} — {r.carLabel} —{" "}
                        {r.origin} → {r.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm font-medium text-blue-600">
                RESERVATION:{" "}
                {selectedReservation
                  ? makeFriendlyReservationCode(selectedReservation.id)
                  : "-"}
              </div>
            </div>

            <div className="overflow-x-auto mt-4">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="text-left pb-2">CAR</th>
                    <th className="text-left pb-2">PLATE</th>
                    <th className="text-left pb-2">DATE</th>
                    <th className="text-left pb-2">DATE</th>
                    <th className="text-left pb-2">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReservation ? (
                    <tr className="text-sm">
                      <td className="py-2 text-foreground">
                        {selectedReservation.carLabel}
                      </td>
                      <td className="py-2 text-foreground">
                        {selectedReservation.plate}
                      </td>
                      <td className="py-2 text-foreground">
                        {selectedReservation.date1}
                      </td>
                      <td className="py-2 text-foreground">
                        {selectedReservation.date2}
                      </td>
                      <td className="py-2">
                        <div className="flex gap-2 items-center">
                          <Badge
                            className={statusChipClasses(
                              chipForReservation(selectedReservation.status),
                            )}
                          >
                            {selectedReservation.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-muted-foreground border-border hover:bg-card"
                          >
                            Cancel
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr className="text-sm">
                      <td
                        className="py-4 text-muted-foreground"
                        colSpan={5}
                      >
                        {loadingReservations
                          ? "Carregando reservas aprovadas ou pendentes..."
                          : "Você ainda não possui reservas planejadas (PENDING ou APPROVED). Crie uma reserva para visualizar os postos no trajeto."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!loadingReservations && reservations.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground max-w-xl">
                Nenhuma reserva planejada encontrada para o seu usuário. Assim
                que você solicitar e/ou tiver uma reserva aprovada, esta tela
                mostrará o trajeto e os postos cadastrados no caminho.
              </p>
            )}

            {error && (
              <p className="mt-2 text-xs text-red-500 max-w-xl">{error}</p>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Route preview (origin/destination da reserva selecionada)
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={handleOpenRouteInMaps}
                    disabled={!selectedReservation}
                  >
                    Abrir rota no Google Maps
                  </Button>
                </div>
                {/* Mapa: embed do Google se houver key, senão imagem estática */}
                <div className="h-96 bg-card rounded-lg relative overflow-hidden">
                  {embedUrl ? (
                    <iframe
                      title="Route map"
                      className="w-full h-full border-0"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={embedUrl}
                    />
                  ) : (
                    <>
                      <img
                        src="/gas-station.png"
                        alt="Route map with gas stations"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-4 left-4 bg-card p-2 rounded shadow-sm text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          <span>Origin</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-red-600 rounded-full" />
                          <span>Destination</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Stations List + filtros funcionais */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Stations on Route
              </h2>

              {/* Search + filtros fluidos */}
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search stations by name or address"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border/50 focus:ring-2 focus:ring-[#1558E9] focus:border-[#1558E9]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Brand:</span>
                    <Select
                      value={selectedBrand}
                      onValueChange={(v: any) => setSelectedBrand(v)}
                      disabled={stations.length === 0}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {brandOptions.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b === "all"
                              ? "All"
                              : b === "independent"
                              ? "GENERIC"
                              : b.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Fuel:</span>
                    <Select
                      value={selectedFuel}
                      onValueChange={(v: any) => setSelectedFuel(v)}
                      disabled={stations.length === 0}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelOptions.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f === "all" ? "All" : f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(selectedBrand !== "all" ||
                    selectedFuel !== "all" ||
                    searchTerm) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs text-muted-foreground"
                      onClick={() => {
                        setSelectedBrand("all");
                        setSelectedFuel("all");
                        setSearchTerm("");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="h-80 overflow-y-auto space-y-3 pr-2">
              {loadingStations && (
                <p className="text-sm text-muted-foreground">
                  Carregando postos no trajeto...
                </p>
              )}

              {!loadingStations && filteredStations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum posto encontrado para esta reserva ou filtros
                  aplicados.
                </p>
              )}

              {filteredStations.map((station) => (
                <Card key={station.id} className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">
                            {station.name}
                          </h3>
                          {/* badges informativos (brand/fuels) */}
                          <Badge
                            variant="outline"
                            className="text-xs border-border/60"
                          >
                            {station.brand === "independent"
                              ? "GENERIC"
                              : station.brand.toUpperCase()}
                          </Badge>
                          {station.fuels.map((f) => (
                            <Badge
                              key={f}
                              variant="outline"
                              className="text-xs border-border/60"
                            >
                              {f}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {station.location}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <Badge
                          className={statusChipClasses(
                            chipForStation(station.status),
                          )}
                        >
                          {station.status}
                        </Badge>
                        <Button
                          variant="outline"
                          size="xs"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleOpenStationInMaps(station)}
                        >
                          Ver no mapa
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
