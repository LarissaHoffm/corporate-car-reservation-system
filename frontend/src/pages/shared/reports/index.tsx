import * as React from "react";
import { useMemo, useRef, useState } from "react";
import { BarChart3, Users, Car, Building, Calendar, Download, X, Plus, Search } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { StatsCard } from "@/components/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type ReservationStatus = "Pending" | "Approved" | "Rejected" | "Completed";
type Reservation = {
  id: string;
  user: string;
  car: string;
  branch: "JLLE" | "CWB" | "MGA" | "POA";
  out: string; // ISO date
  status: ReservationStatus;
};

const MOCK_RESERVATIONS: Reservation[] = [
  { id: "R1", user: "Alex Morgan",  car: "BMW X5",        branch: "JLLE", status: "Approved",  out: "2025-10-02" },
  { id: "R2", user: "Bruno Souza",  car: "Toyota Camry",  branch: "CWB",  status: "Pending",   out: "2025-10-05" },
  { id: "R3", user: "Carla Lima",   car: "Honda Civic",   branch: "MGA",  status: "Approved",  out: "2025-09-28" },
  { id: "R4", user: "Diana Prince", car: "Honda Civic",   branch: "POA",  status: "Completed", out: "2025-09-12" },
  { id: "R5", user: "Bruce Wayne",  car: "Toyota Camry",  branch: "JLLE", status: "Rejected",  out: "2025-10-08" },
  { id: "R6", user: "Clark Kent",   car: "Tesla Model 3", branch: "CWB",  status: "Approved",  out: "2025-10-11" },
  { id: "R7", user: "Alex Morgan",  car: "Tesla Model 3", branch: "JLLE", status: "Pending",   out: "2025-10-20" },
  { id: "R8", user: "Bruno Souza",  car: "BMW X5",        branch: "MGA",  status: "Completed", out: "2025-08-30" },
];

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
        .filter((n) => (normalized ? n.toLowerCase().includes(normalized) : true))
        .slice(0, 8),
    [options, value, normalized]
  );

  const addToken = (token: string) => {
    const t = token.trim();
    if (!t) return;
    if (!value.includes(t)) onChange([...value, t]);
    setQuery("");
    setOpen(false);
  };

  const removeToken = (token: string) => onChange(value.filter((v) => v !== token));

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
          <Badge key={v} variant="secondary" className="flex items-center gap-1">
            {v}
            <button className="hover:text-foreground/80" onClick={(e) => { e.stopPropagation(); removeToken(v); }}>
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
            <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50" onClick={() => addToken(query)}>
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

export default function SharedReportsPage() {
  // filtros
  const [userTokens, setUserTokens] = useState<string[]>([]); 
  const [carFilter, setCarFilter] = useState<"all" | "BMW X5" | "Toyota Camry" | "Honda Civic" | "Tesla Model 3">("all");
  const [branchFilter, setBranchFilter] = useState<"all" | "JLLE" | "CWB" | "MGA" | "POA">("all");
  const [range, setRange] = useState<"30days" | "quarter" | "year">("30days");

  const allUsers = useMemo(
    () => Array.from(new Set(MOCK_RESERVATIONS.map((r) => r.user))).sort(),
    []
  );

  const filtered = useMemo(() => {
    const now = new Date("2025-10-15"); // base mock
    const start = new Date(now);

    if (range === "30days") start.setDate(now.getDate() - 30);
    if (range === "quarter") start.setMonth(now.getMonth() - 3);
    if (range === "year") start.setFullYear(now.getFullYear() - 1);

    return MOCK_RESERVATIONS.filter((r) => {
      const dateOut = new Date(r.out);
      const byRange = dateOut >= start && dateOut <= now;
      const byCar = carFilter === "all" ? true : r.car === carFilter;
      const byBranch = branchFilter === "all" ? true : r.branch === branchFilter;

      const byUsers =
        userTokens.length === 0
          ? true
          : userTokens.some((t) => r.user.toLowerCase().includes(t.toLowerCase()));

      return byRange && byCar && byBranch && byUsers;
    });
  }, [userTokens, carFilter, branchFilter, range]);

  // KPIs 
  const kpis = useMemo(() => {
    const total = filtered.length;
    const active = filtered.filter((r) => r.status === "Approved" || r.status === "Pending").length;
    const uniqueUsers = new Set(filtered.map((r) => r.user)).size;
    const utilization =
      total === 0 ? "0%" : `${Math.round((active / total) * 100)}%`;

    return { total, active, uniqueUsers, utilization };
  }, [filtered]);

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Analyze and export reservation data with flexible filters.</p>
        </div>

        {/* KPIs conectados ao filtro */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard title="Total Reservations" value={String(kpis.total)} icon={BarChart3} />
          <StatsCard title="Active Reservations" value={String(kpis.active)} icon={Car} />
          <StatsCard title="Total Users" value={String(kpis.uniqueUsers)} icon={Users} />
          <StatsCard title="Utilization" value={kpis.utilization} icon={BarChart3} />
        </div>

        {/* Filtros + export */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* User: multi + livre */}
              <div className="lg:col-span-5">
                <label className="text-sm text-muted-foreground mb-1 block">Users</label>
                <MultiUserFilter
                  options={allUsers}
                  value={userTokens}
                  onChange={setUserTokens}
                  placeholder="Type a user name and press Enter (or pick from the list)…"
                />
              </div>

              {/* Car */}
              <div className="lg:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Car</label>
                <Select value={carFilter} onValueChange={(v: any) => setCarFilter(v)}>
                  <SelectTrigger className="w-full border-border/50 focus:ring-2 focus:ring-[#1558E9]">
                    <SelectValue placeholder="All Cars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cars</SelectItem>
                    <SelectItem value="BMW X5">BMW X5</SelectItem>
                    <SelectItem value="Toyota Camry">Toyota Camry</SelectItem>
                    <SelectItem value="Honda Civic">Honda Civic</SelectItem>
                    <SelectItem value="Tesla Model 3">Tesla Model 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Branch */}
              <div className="lg:col-span-2">
                <label className="text-sm text-muted-foreground mb-1 block">Branch</label>
                <Select value={branchFilter} onValueChange={(v: any) => setBranchFilter(v)}>
                  <SelectTrigger className="w-full border-border/50 focus:ring-2 focus:ring-[#1558E9]">
                    <SelectValue placeholder="All Branches" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    <SelectItem value="JLLE">JLLE</SelectItem>
                    <SelectItem value="CWB">CWB</SelectItem>
                    <SelectItem value="MGA">MGA</SelectItem>
                    <SelectItem value="POA">POA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date range */}
              <div className="lg:col-span-3">
                <label className="text-sm text-muted-foreground mb-1 block">Date Range</label>
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
                onClick={() => {
                  console.log("Export CSV", filtered);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                className="border-border/50 hover:bg-card focus:ring-2 focus:ring-[#1558E9] bg-transparent"
                onClick={() => {
                  console.log("Export PDF", filtered);
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Users className="h-5 w-5 text-[#1558E9]" />
                Reports by User
              </CardTitle>
              <p className="text-sm text-muted-foreground">Analyze reservations and spend by user.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Top 10 Users with Most Reservations
              </Button>
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by User (Last Quarter)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Car className="h-5 w-5 text-[#1558E9]" />
                Reports by Car
              </CardTitle>
              <p className="text-sm text-muted-foreground">Mileage, reservations, and utilization.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Top 5 Cars with Highest Mileage
              </Button>
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by Car (Last Quarter)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Building className="h-5 w-5 text-[#1558E9]" />
                Reports by Branch
              </CardTitle>
              <p className="text-sm text-muted-foreground">Compare performance by branch.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by Branch (Monthly)
              </Button>
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Reservations by Branch (Quarterly)
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Calendar className="h-5 w-5 text-[#1558E9]" />
                Reports by Period
              </CardTitle>
              <p className="text-sm text-muted-foreground">Time-based trends and insights.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Last 30 Days Reservations
              </Button>
              <Button variant="outline" className="w-full justify-start border-border/50 bg-transparent hover:bg-muted/50">
                <Download className="h-4 w-4 mr-2 text-[#1558E9]" />
                Quarterly Trend Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
