import * as React from "react";
import { useMemo, useState } from "react";
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

type Reservation = {
  id: string;
  car: string;
  plate: string;
  date1: string;
  date2: string;
  status: "Active" | "Confirmed" | "Pending";
};

type Fuel = "Petrol" | "Diesel" | "EV";
type Brand = "shell" | "bp" | "independent";

type Station = {
  id: string;
  name: string;
  code: string;
  location: string;
  brand: Brand;
  fuels: Fuel[];
  status: "Active" | "Inactive";
};

const mockReservations: Reservation[] = [
  {
    id: "DSSS",
    car: "Fleet Sedan",
    plate: "ABC-1A23",
    date1: "Aug 03, 2025",
    date2: "Aug 05, 2025",
    status: "Active",
  },
  {
    id: "R48293",
    car: "Toyota Corolla",
    plate: "7FJ-392",
    date1: "Aug 04, 2025",
    date2: "Aug 07, 2025",
    status: "Confirmed",
  },
  {
    id: "R48294",
    car: "Honda Civic",
    plate: "8GK-493",
    date1: "Aug 10, 2025",
    date2: "Aug 12, 2025",
    status: "Pending",
  },
];

const mockStations: Station[] = [
  {
    id: "1",
    name: "EcoFuel",
    code: "A1",
    location: "A1 Service Area, Exit 12",
    brand: "shell",
    fuels: ["Petrol", "Diesel"],
    status: "Active",
  },
  {
    id: "2",
    name: "PrimeGas",
    code: "N16",
    location: "N16 Northbound, Km 54",
    brand: "bp",
    fuels: ["Petrol"],
    status: "Active",
  },
  {
    id: "3",
    name: "QuickFill",
    code: "R2",
    location: "R2 Ring Road, Gate 5",
    brand: "independent",
    fuels: ["Diesel"],
    status: "Inactive",
  },
  {
    id: "4",
    name: "CityFuel",
    code: "Downtown",
    location: "24 King St, City Center",
    brand: "bp",
    fuels: ["Petrol", "EV"],
    status: "Active",
  },
  {
    id: "5",
    name: "HighwayMax",
    code: "A3",
    location: "A3 Westbound, Mile 102",
    brand: "shell",
    fuels: ["Petrol", "Diesel"],
    status: "Inactive",
  },
];

function chipForReservation(
  s: Reservation["status"],
): "Pendente" | "Aprovado" | "Rejeitado" {
  // Active/Confirmed => Aprovado (verde), Pending => Pendente (âmbar)
  if (s === "Pending") return "Pendente";
  return "Aprovado";
}

function chipForStation(
  s: Station["status"],
): "Pendente" | "Aprovado" | "Rejeitado" {
  // Active => Aprovado (verde), Inactive => Rejeitado (vermelho)
  return s === "Active" ? "Aprovado" : "Rejeitado";
}

export default function GasStationsPage() {
  // seleção de reserva
  const [selectedReservationId, setSelectedReservationId] = useState<string>(
    mockReservations[0].id,
  );
  const selectedReservation =
    mockReservations.find((r) => r.id === selectedReservationId) ??
    mockReservations[0];

  // filtros das estações
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<"all" | Brand>("all");
  const [selectedFuel, setSelectedFuel] = useState<"all" | Fuel>("all");

  // opções dinâmicas (a partir do mock)
  const brandOptions = useMemo<("all" | Brand)[]>(() => {
    const set = new Set<Brand>();
    mockStations.forEach((s) => set.add(s.brand));
    return ["all", ...Array.from(set)];
  }, []);

  const fuelOptions = useMemo<("all" | Fuel)[]>(() => {
    const set = new Set<Fuel>();
    mockStations.forEach((s) => s.fuels.forEach((f) => set.add(f)));
    return ["all", ...Array.from(set)];
  }, []);

  // filtro aplicado
  const filteredStations = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return mockStations.filter((s) => {
      const byQuery =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q);
      const byBrand = selectedBrand === "all" || s.brand === selectedBrand;
      const byFuel = selectedFuel === "all" || s.fuels.includes(selectedFuel);
      return byQuery && byBrand && byFuel;
    });
  }, [searchTerm, selectedBrand, selectedFuel]);

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
                  value={selectedReservationId}
                  onValueChange={setSelectedReservationId}
                >
                  <SelectTrigger className="w-56 border-border/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockReservations.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        #{r.id} — {r.car}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="text-sm font-medium text-blue-600">
                RESERVATION: #{selectedReservation.id}
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
                  <tr className="text-sm">
                    <td className="py-2 text-foreground">
                      {selectedReservation.car}
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
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-4">
                {/* Mapa (mock) */}
                <div className="h-96 bg-card rounded-lg relative overflow-hidden">
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
                    placeholder="Search stations by name, code or location"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border/50 focus:ring-2 focus:ring-[#1558E9] focus:border-[#1558E9]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Branch:</span>
                    <Select
                      value={selectedBrand}
                      onValueChange={(v: any) => setSelectedBrand(v)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs border-border/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {brandOptions.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b === "all" ? "All" : b.toUpperCase()}
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
              {filteredStations.map((station) => (
                <Card key={station.id} className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground">
                            {station.name} — {station.code}
                          </h3>
                          {/* badges informativos (brand/fuels) */}
                          <Badge
                            variant="outline"
                            className="text-xs border-border/60"
                          >
                            {station.brand.toUpperCase()}
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

                      <Badge
                        className={statusChipClasses(
                          chipForStation(station.status),
                        )}
                      >
                        {station.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredStations.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No stations match the current filters.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
