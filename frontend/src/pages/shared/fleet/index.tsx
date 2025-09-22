import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Car, Plus, Search, Eye, ArrowLeft } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { statusChipClasses } from "@/components/ui/status";

type FleetStatus = "Available" | "Reserved" | "Maintenance" | "Unavailable";
type CarType = "SUV" | "SEDAN" | "HATCH";
type FuelType = "Petrol" | "Diesel" | "Electric";

type Vehicle = {
  id: string;
  model: string;
  plate: string;
  color: string;
  lastService: string; // ISO date
  status: FleetStatus;
  type: CarType;
  fuel: FuelType;
  branch: string;
};

const FLEET_KEY = "fleet";

const loadFleet = (): Vehicle[] => {
  try {
    const raw = localStorage.getItem(FLEET_KEY);
    if (raw) return JSON.parse(raw) as Vehicle[];
  } catch {}
  return [
    { id: "1", model: "BMW X5",        plate: "ABC-1234", color: "Black",  lastService: "2025-10-15", status: "Available",   type: "SUV",   fuel: "Petrol",  branch: "JLLE" },
    { id: "2", model: "Toyota Camry",  plate: "DEF-5678", color: "Blue",   lastService: "2025-10-10", status: "Reserved",    type: "SEDAN", fuel: "Petrol",  branch: "CWB"  },
    { id: "3", model: "Honda Civic",   plate: "GHI-9012", color: "Silver", lastService: "2025-09-25", status: "Maintenance", type: "SEDAN", fuel: "Diesel",  branch: "MGA"  },
    { id: "4", model: "Tesla Model 3", plate: "JES-3003", color: "White",  lastService: "2025-09-20", status: "Unavailable", type: "HATCH", fuel: "Electric",branch: "POA"  },
  ];
};

const saveFleet = (list: Vehicle[]) => localStorage.setItem(FLEET_KEY, JSON.stringify(list));

const BRANCHES = ["JLLE", "CWB", "MGA", "POA", "SP", "RJ", "CXS", "RBP", "Centro"] as const;

export default function FleetManagement() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>(loadFleet);
  useEffect(() => saveFleet(vehicles), [vehicles]);

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [fuelFilter, setFuelFilter] = useState<string>("all");

  // modal
  const [isNewCarModalOpen, setIsNewCarModalOpen] = useState(false);
  const [newCarData, setNewCarData] = useState<Partial<Vehicle>>({
    model: "",
    plate: "",
    color: "",
    lastService: new Date().toISOString().slice(0, 10),
    status: "Available",
    type: undefined,
    fuel: undefined,
    branch: undefined,
  });

  const modelOptions = useMemo(() => ["all", ...Array.from(new Set(vehicles.map(v => v.model)))], [vehicles]);

  // KPIs
  const stats = useMemo(() => {
    const total = vehicles.length;
    const available = vehicles.filter(v => v.status === "Available").length;
    const reserved = vehicles.filter(v => v.status === "Reserved").length;
    const maintenance = vehicles.filter(v => v.status === "Maintenance").length;
    return [
      { title: "Total Fleet", value: String(total), icon: Car, highlighted: true },
      { title: "Available", value: String(available), icon: Car },
      { title: "Reserved", value: String(reserved), icon: Car },
      { title: "Maintenance", value: String(maintenance), icon: Car },
    ];
  }, [vehicles]);

  const filtered = useMemo(() => {
    const text = searchTerm.trim().toLowerCase();
    return vehicles.filter(v => {
      const byText =
        !text ||
        v.model.toLowerCase().includes(text) ||
        v.plate.toLowerCase().includes(text) ||
        v.color.toLowerCase().includes(text);
      const byModel = modelFilter === "all" ? true : v.model === modelFilter;
      const byBranch = branchFilter === "all" ? true : v.branch === branchFilter;
      const byFuel = fuelFilter === "all" ? true : v.fuel === (fuelFilter as FuelType);
      return byText && byModel && byBranch && byFuel;
    });
  }, [vehicles, searchTerm, modelFilter, branchFilter, fuelFilter]);

  const handleViewDetails = (vehicleId: string) => navigate(`${vehicleId}`);

  const resetForm = () =>
    setNewCarData({
      model: "",
      plate: "",
      color: "",
      lastService: new Date().toISOString().slice(0, 10),
      status: "Available",
      type: undefined,
      fuel: undefined,
      branch: undefined,
    });

  const handleNewCarSubmit = () => {
    if (!newCarData.model || !newCarData.plate || !newCarData.type || !newCarData.fuel || !newCarData.branch) return;

    const newV: Vehicle = {
      id: crypto.randomUUID(),
      model: newCarData.model!,
      plate: newCarData.plate!,
      color: newCarData.color || "-",
      lastService: newCarData.lastService || new Date().toISOString().slice(0, 10),
      status: (newCarData.status as FleetStatus) || "Available",
      type: newCarData.type as CarType,
      fuel: newCarData.fuel as FuelType,
      branch: newCarData.branch as string,
    };
    setVehicles(prev => [newV, ...prev]);
    setIsNewCarModalOpen(false);
    resetForm();
  };

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header + Add */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Fleet Management</h1>
            <p className="text-muted-foreground">Manage your corporate vehicle fleet</p>
          </div>

          <Dialog open={isNewCarModalOpen} onOpenChange={(o) => { setIsNewCarModalOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] border-border/50 shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-foreground">New Vehicle</DialogTitle>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Model</Label>
                  <Input
                    placeholder="e.g. Honda Civic"
                    value={newCarData.model || ""}
                    onChange={(e) => setNewCarData({ ...newCarData, model: e.target.value })}
                    className="border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Plate</Label>
                  <Input
                    placeholder="ABC-1234"
                    value={newCarData.plate || ""}
                    onChange={(e) => setNewCarData({ ...newCarData, plate: e.target.value.toUpperCase() })}
                    className="border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Color</Label>
                  <Input
                    placeholder="Color"
                    value={newCarData.color || ""}
                    onChange={(e) => setNewCarData({ ...newCarData, color: e.target.value })}
                    className="border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Type</Label>
                  <Select
                    value={newCarData.type as CarType | undefined}
                    onValueChange={(v: CarType) => setNewCarData({ ...newCarData, type: v })}
                  >
                    <SelectTrigger className="border-border/50 focus:border-[#1558E9] shadow-sm">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUV">SUV</SelectItem>
                      <SelectItem value="SEDAN">SEDAN</SelectItem>
                      <SelectItem value="HATCH">HATCH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Fuel</Label>
                  <Select
                    value={newCarData.fuel as FuelType | undefined}
                    onValueChange={(v: FuelType) => setNewCarData({ ...newCarData, fuel: v })}
                  >
                    <SelectTrigger className="border-border/50 focus:border-[#1558E9] shadow-sm">
                      <SelectValue placeholder="Select fuel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Petrol">Petrol</SelectItem>
                      <SelectItem value="Diesel">Diesel</SelectItem>
                      <SelectItem value="Electric">Electric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Branch</Label>
                  <Select
                    value={newCarData.branch}
                    onValueChange={(v: string) => setNewCarData({ ...newCarData, branch: v })}
                  >
                    <SelectTrigger className="border-border/50 focus:border-[#1558E9] shadow-sm">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Status</Label>
                  <Select
                    value={newCarData.status as FleetStatus}
                    onValueChange={(v: FleetStatus) => setNewCarData({ ...newCarData, status: v })}
                  >
                    <SelectTrigger className="border-border/50 focus:border-[#1558E9] shadow-sm">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Reserved">Reserved</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Unavailable">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Last Service</Label>
                  <Input
                    type="date"
                    value={newCarData.lastService || ""}
                    onChange={(e) => setNewCarData({ ...newCarData, lastService: e.target.value })}
                    className="border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setIsNewCarModalOpen(false)} className="border-border/50 hover:bg-card/50 shadow-sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleNewCarSubmit} className="bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm">
                  Save Vehicle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <Card key={stat.title} className={`border-border/50 shadow-sm ${stat.highlighted ? "bg-[#1558E9] text-white" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${stat.highlighted ? "text-white/80" : "text-muted-foreground"}`}>{stat.title}</p>
                    <p className={`text-2xl font-bold ${stat.highlighted ? "text-white" : "text-foreground"}`}>{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.highlighted ? "text-white/80" : "text-[#1558E9]"}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by model, plate or color…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-border/50 focus:border-[#1558E9] shadow-sm"
                  />
                </div>
              </div>

              <Select value={modelFilter} onValueChange={setModelFilter}>
                <SelectTrigger className="w-[180px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Model" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map(m => (
                    <SelectItem key={m} value={m}>{m === "all" ? "All Models" : m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-[160px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={fuelFilter} onValueChange={setFuelFilter}>
                <SelectTrigger className="w-[160px] border-border/50 focus:border-[#1558E9] shadow-sm">
                  <SelectValue placeholder="Fuel Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Fuel Types</SelectItem>
                  <SelectItem value="Petrol">Petrol</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Cards de veículos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((v) => (
            <Card key={v.id} className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{v.model}</h3>
                    <Badge className={statusChipClasses(v.status)}>{v.status}</Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Plate</span><span className="text-foreground">{v.plate}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Color</span><span className="text-foreground">{v.color}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="text-foreground">{v.type}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Fuel</span><span className="text-foreground">{v.fuel}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Branch</span><span className="text-foreground">{v.branch}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Last Service</span><span className="text-foreground">{v.lastService}</span></div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-transparent border-border/50 hover:bg-card/50 shadow-sm"
                    onClick={() => handleViewDetails(v.id)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
