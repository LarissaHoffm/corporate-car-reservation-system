import * as React from "react";
import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Users,
  Car,
  Building,
  Calendar,
  Download,
  X,
  Plus,
  Search,
} from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/http/api";

type ReservationStatus =
  | "PENDING"
  | "APPROVED"
  | "CANCELED"
  | "COMPLETED"
  | "REJECTED"
  | string;

type ReservationView = {
  id: string;
  code: string;
  status: ReservationStatus;
  startAt?: string | null;
  endAt?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  carModel?: string | null;
  carPlate?: string | null;
  branchName?: string | null;
};

function mapReservation(raw: any): ReservationView {
  const user =
    raw.user || raw.requester || raw.requesterUser || raw.requesterUserInfo || {};
  const car = raw.car || raw.assignedCar || {};
  const branch = raw.branch || raw.carBranch || {};

  const startAt = raw.startAt || raw.startDate || raw.departureAt || null;
  const endAt = raw.endAt || raw.endDate || raw.returnAt || null;

  const codeBase: string =
    raw.friendlyCode ||
    raw.friendlyId ||
    raw.code ||
    (typeof raw.id === "string" ? raw.id : String(raw.id));

  const shortCode =
    typeof codeBase === "string" && codeBase.length > 8
      ? codeBase.slice(0, 8).toUpperCase()
      : codeBase;

  return {
    id: String(raw.id),
    code: shortCode,
    status: (raw.status as ReservationStatus) ?? "",
    startAt,
    endAt,
    userName: user.name || user.fullName || user.email || null,
    userEmail: user.email || null,
    carModel: car.model || car.name || null,
    carPlate: car.plate || null,
    branchName: branch.name || null,
  };
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function filterByPeriod(
  items: ReservationView[],
  preset: "30days" | "quarter" | "12months",
): ReservationView[] {
  const now = new Date();
  const start = new Date(now);

  if (preset === "30days") start.setDate(now.getDate() - 30);
  if (preset === "quarter") start.setMonth(now.getMonth() - 3);
  if (preset === "12months") start.setFullYear(now.getFullYear() - 1);

  return items.filter((r) => {
    const date = parseDate(r.startAt) || parseDate(r.endAt);
    if (!date) return false;
    return date >= start && date <= now;
  });
}

function exportCsv(items: ReservationView[], filename: string) {
  if (!items.length) {
    alert("Não há dados para exportar com esses critérios.");
    return;
  }

  const header = [
    "ReservationCode",
    "UserName",
    "UserEmail",
    "CarModel",
    "CarPlate",
    "Branch",
    "StartAt",
    "EndAt",
    "Status",
  ];

  const rows = items.map((r) => [
    r.code ?? "",
    r.userName ?? "",
    r.userEmail ?? "",
    r.carModel ?? "",
    r.carPlate ?? "",
    r.branchName ?? "",
    r.startAt ?? "",
    r.endAt ?? "",
    r.status ?? "",
  ]);

  const escapeCell = (value: string) =>
    `"${value.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

  const csv = [header, ...rows]
    .map((row) => row.map((cell) => escapeCell(String(cell))).join(";"))
    .join("\r\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------- MultiUserFilter (mesmo design) ----------------

function MultiUserFilter({
  options,
  value,
  onChange,
  placeholder = "Type a user and press Enter…",
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const normalized = query.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      options
        .filter((n) => !value.includes(n))
        .filter((n) =>
          normalized ? n.toLowerCase().includes(normalized) : true,
        )
        .slice(0, 8),
    [options, value, normalized],
  );

  const addToken = (token: string) => {
    const t = token.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setQuery("");
    setOpen(false);
  };

  const removeToken = (token: string) =>
    onChange(value.filter((v) => v !== token));

  return (
    <div className="w-full relative">
      <div
        className="flex min-h-10 w-full flex-wrap gap-2 rounded-md border border-border/50 bg-background px-2 py-1 focus-within:ring-2 focus-within:ring-[#1558E9]"
        onClick={() => {
          inputRef.current?.focus();
          setOpen(true);
        }}
      >
        {value.map((v) => (
          <Badge
            key={v}
            variant="secondary"
            className="flex items-center gap-1"
          >
            {v}
            <button
              className="hover:text-foreground/80"
              onClick={(e) => {
                e.stopPropagation();
                removeToken(v);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <div className="flex-1 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addToken(query);
              } else if (e.key === "Backspace" && !query && value.length) {
                removeToken(value[value.length - 1]);
              }
            }}
            placeholder={placeholder}
            className="h-8 w-full bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      {open && (suggestions.length > 0 || query) && (
        <div
          className="absolute z-10 mt-1 w-full rounded-md border border-border/50 bg-popover shadow-md"
          onMouseDown={(e) => e.preventDefault()}
        >
          {suggestions.map((s) => (
            <button
              key={s}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
              onClick={() => addToken(s)}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3 text-muted-foreground" />
                {s}
              </div>
            </button>
          ))}
          {query.trim() && !options.includes(query.trim()) && (
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50"
              onClick={() => addToken(query)}
            >
              <div className="flex items-center gap-2">
                <Plus className="h-3 w-3 text-muted-foreground" />
                Add “{query.trim()}”
              </div>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------- Página principal (ADMIN / APPROVER) ----------------
const alphaSort = (a: string, b: string) =>
  a.localeCompare(b, "pt-BR", { sensitivity: "base" });

export default function SharedReportsPage() {
  const [reservations, setReservations] = useState<ReservationView[]>([]);
  const [loading, setLoading] = useState(false);

  // filtros (somente para export dos filtros)
  const [userTokens, setUserTokens] = useState<string[]>([]);
  const [carFilter, setCarFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [range, setRange] = useState<"30days" | "quarter" | "year">("30days");

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/reports/reservations", {
        params: { skip: 0, take: 1000 },
      });

      const rawItems = (res.data?.items ?? res.data ?? []) as any[];
      const mapped = rawItems.map(mapReservation);
      setReservations(mapped);
    } catch (err: any) {
      console.error("Erro ao carregar relatórios:", err);
      const msg =
        err?.userMessage ||
        err?.message ||
        "Não foi possível carregar os dados de relatório.";
      alert(msg);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

const allUsers = useMemo(
  () =>
    Array.from(
      new Set(
        reservations
          .map((r) => r.userName)
          .filter((n): n is string => !!n && n.trim().length > 0),
      ),
    ).sort(alphaSort),
  [reservations],
);

const allCars = useMemo(
  () =>
    Array.from(
      new Set(
        reservations
          .map((r) => r.carModel)
          .filter((n): n is string => !!n && n.trim().length > 0),
      ),
    ).sort(alphaSort),
  [reservations],
);

const allBranches = useMemo(
  () =>
    Array.from(
      new Set(
        reservations
          .map((r) => r.branchName)
          .filter((n): n is string => !!n && n.trim().length > 0),
      ),
    ).sort(alphaSort),
  [reservations],
);


  // KPIs globais (não dependem dos filtros, só dos dados carregados)
  const globalStats = useMemo(() => {
    const total = reservations.length;
    const pendingApproval = reservations.filter(
      (r) => r.status === "PENDING",
    ).length;
    const completedTrips = reservations.filter(
      (r) => r.status === "COMPLETED",
    ).length;
    const canceledReservations = reservations.filter(
      (r) => r.status === "CANCELED" || r.status === "REJECTED",
    ).length;

    return { total, pendingApproval, completedTrips, canceledReservations };
  }, [reservations]);

  // Conjunto filtrado (para o botão Export CSV de filtros)
  const filteredForExport = useMemo(() => {
    if (!reservations.length) return [];

    const now = new Date();
    const start = new Date(now);

    if (range === "30days") start.setDate(now.getDate() - 30);
    if (range === "quarter") start.setMonth(now.getMonth() - 3);
    if (range === "year") start.setFullYear(now.getFullYear() - 1);

    return reservations.filter((r) => {
      // período
      const d = parseDate(r.startAt) || parseDate(r.endAt);
      const byRange = d ? d >= start && d <= now : false;

      // carro
      const byCar =
        carFilter === "all" ? true : r.carModel === carFilter || !r.carModel;

      // filial
      const byBranch =
        branchFilter === "all"
          ? true
          : r.branchName === branchFilter || !r.branchName;

      // usuários (tokens por nome, contém)
      const byUsers =
        userTokens.length === 0
          ? true
          : userTokens.some((t) =>
              (r.userName ?? "")
                .toLowerCase()
                .includes(t.toLowerCase().trim()),
            );

      return byRange && byCar && byBranch && byUsers;
    });
  }, [reservations, range, carFilter, branchFilter, userTokens]);

  const handleExportFiltersCsv = () => {
    try {
      exportCsv(
        filteredForExport,
        "reservations_filters_" + new Date().toISOString().slice(0, 10) + ".csv",
      );
    } catch {
      alert("Não foi possível exportar o CSV. Tente novamente.");
    }
  };

  type PresetKey =
    | "user-last-quarter"
    | "user-canceled-12m"
    | "car-last-quarter"
    | "car-12m"
    | "branch-last-quarter"
    | "branch-12m"
    | "period-last-30days"
    | "period-12m";

  const handleExportPreset = (preset: PresetKey) => {
    if (!reservations.length) {
      alert("Não há dados de reservas para exportar.");
      return;
    }

    let subset: ReservationView[] = [];
    let filename = "reservations.csv";

    switch (preset) {
      case "user-last-quarter":
        subset = filterByPeriod(reservations, "quarter").sort((a, b) =>
          (a.userName ?? "").localeCompare(b.userName ?? ""),
        );
        filename = "reservations_by_user_last_quarter.csv";
        break;
      case "user-canceled-12m":
        subset = filterByPeriod(reservations, "12months").filter(
          (r) => r.status === "CANCELED" || r.status === "REJECTED",
        );
        subset.sort((a, b) =>
          (a.userName ?? "").localeCompare(b.userName ?? ""),
        );
        filename = "canceled_reservations_by_user_last_12_months.csv";
        break;
      case "car-last-quarter":
        subset = filterByPeriod(reservations, "quarter").sort((a, b) =>
          (a.carModel ?? "").localeCompare(b.carModel ?? ""),
        );
        filename = "reservations_by_car_last_quarter.csv";
        break;
      case "car-12m":
        subset = filterByPeriod(reservations, "12months").sort((a, b) =>
          (a.carModel ?? "").localeCompare(b.carModel ?? ""),
        );
        filename = "reservations_by_car_last_12_months.csv";
        break;
      case "branch-last-quarter":
        subset = filterByPeriod(reservations, "quarter").sort((a, b) =>
          (a.branchName ?? "").localeCompare(b.branchName ?? ""),
        );
        filename = "reservations_by_branch_last_quarter.csv";
        break;
      case "branch-12m":
        subset = filterByPeriod(reservations, "12months").sort((a, b) =>
          (a.branchName ?? "").localeCompare(b.branchName ?? ""),
        );
        filename = "reservations_by_branch_last_12_months.csv";
        break;
      case "period-last-30days":
        subset = filterByPeriod(reservations, "30days").sort((a, b) =>
          (parseDate(a.startAt)?.getTime() || 0) -
          (parseDate(b.startAt)?.getTime() || 0),
        );
        filename = "reservations_last_30_days.csv";
        break;
      case "period-12m":
        subset = filterByPeriod(reservations, "12months").sort((a, b) =>
          (parseDate(a.startAt)?.getTime() || 0) -
          (parseDate(b.startAt)?.getTime() || 0),
        );
        filename = "reservations_last_12_months.csv";
        break;
    }

    try {
      exportCsv(subset, filename);
    } catch {
      alert("Não foi possível exportar o CSV. Tente novamente.");
    }
  };

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Analyze and export reservation data with flexible filters.
          </p>
        </div>

        {/* KPIs globais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Reservations"
            value={String(globalStats.total)}
            icon={BarChart3}
          />
          <StatsCard
            title="Pending Approval"
            value={String(globalStats.pendingApproval)}
            icon={Calendar}
          />
          <StatsCard
            title="Completed Trips"
            value={String(globalStats.completedTrips)}
            icon={BarChart3}
          />
          <StatsCard
            title="Canceled Reservations"
            value={String(globalStats.canceledReservations)}
            icon={BarChart3}
          />
        </div>

        {/* Filtros + export CSV */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Users */}
              <div className="lg:col-span-5">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Users
                </label>
                <MultiUserFilter
                  options={allUsers}
                  value={userTokens}
                  onChange={setUserTokens}
                  placeholder="Type a user name and press Enter (or pick from the list)…"
                />
              </div>

              {/* Car */}
              <div className="lg:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Car
                </label>
                <Select
                  value={carFilter}
                  onValueChange={(v) => setCarFilter(v)}
                >
                  <SelectTrigger className="w-full border-border/50 focus:ring-2 focus:ring-[#1558E9]">
                    <SelectValue placeholder="All Cars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cars</SelectItem>
                    {allCars.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Branch */}
              <div className="lg:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Branch
                </label>
                <Select
                  value={branchFilter}
                  onValueChange={(v) => setBranchFilter(v)}
                >
                  <SelectTrigger className="w-full border-border/50 focus:ring-2 focus:ring-[#1558E9]">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {allBranches.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="lg:col-span-3">
                <label className="text-sm text-muted-foreground mb-1 block">
                  Date Range
                </label>
                <Select value={range} onValueChange={(v: any) => setRange(v)}>
                  <SelectTrigger className="w-full border-border/50 focus:ring-2 focus:ring-[#1558E9]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                className="border-border/50 hover:bg-card focus:ring-2 focus:ring-[#1558E9] bg-transparent"
                disabled={loading || !reservations.length}
                onClick={handleExportFiltersCsv}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de presets (User / Car / Branch / Period) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reports by User */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Users className="h-5 w-5 text-[#1558E9]" />
                Reports by User
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Reservations with user dimension (analyze in Excel).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("user-last-quarter")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by User (Last Quarter)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("user-canceled-12m")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Canceled Reservations (Last 12 Months)
              </Button>
            </CardContent>
          </Card>

          {/* Reports by Car */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Car className="h-5 w-5 text-[#1558E9]" />
                Reports by Car
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Mileage, reservations, and utilization.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("car-last-quarter")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by Car (Last Quarter)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("car-12m")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by Car (Last 12 Months)
              </Button>
            </CardContent>
          </Card>

          {/* Reports by Branch */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Building className="h-5 w-5 text-[#1558E9]" />
                Reports by Branch
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare reservations between branches.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("branch-last-quarter")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by Branch (Last Quarter)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("branch-12m")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by Branch (Last 12 Months)
              </Button>
            </CardContent>
          </Card>

          {/* Reports by Period */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Calendar className="h-5 w-5 text-[#1558E9]" />
                Reports by Period
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Time-based trends and insights.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("period-last-30days")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Last 30 Days Reservations
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50"
                disabled={loading || !reservations.length}
                onClick={() => handleExportPreset("period-12m")}
              >
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Last 12 Months Reservations
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
