import * as React from "react";
import { useMemo, useState } from "react";
import { Fuel, MapPin, Clock, Zap, Plus, Search, Pencil, Trash2, ArrowLeft } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { statusChipClasses } from "@/components/ui/status";

type StationStatus = "Active" | "Inactive";

type Station = {
    id: string;
    name: string;
    address: string;
    city: string;
    phone: string;
    openHours: string;
    fuelTypes: string[];
    status: StationStatus;
};

const SEED: Station[] = [
    { id: "s1", name: "Speedy Fuels", address: "123 Main St", city: "Cityville", phone: "(47) 3333-0000", openHours: "24h", fuelTypes: ["Petrol", "Diesel"], status: "Active" },
    { id: "s2", name: "Auto Posto Azul", address: "Av. Brasil, 500", city: "Cityville", phone: "(41) 3222-1111", openHours: "06–22h", fuelTypes: ["Petrol"], status: "Active" },
    { id: "s3", name: "PetroMais", address: "R. Paraná, 80", city: "Downtown", phone: "(44) 3344-2222", openHours: "07–21h", fuelTypes: ["Diesel"], status: "Inactive" },
    { id: "s4", name: "Rápido Oil", address: "Av. JK, 1200", city: "Cityville", phone: "(47) 3555-3333", openHours: "24h", fuelTypes: ["Petrol"], status: "Active" },
];

const EMPTY_FORM: Omit<Station, "id"> = {
    name: "",
    address: "",
    city: "",
    phone: "",
    openHours: "",
    fuelTypes: [],
    status: "Active",
};

export default function SharedGasStationsPage() {
    const [stations, setStations] = useState<Station[]>(SEED);

    // filtros
    const [search, setSearch] = useState("");
    const [cityFilter, setCityFilter] = useState<"all" | "Cityville" | "Downtown">("all");
    const [statusFilter, setStatusFilter] = useState<"all" | StationStatus>("all");
    const [fuelFilter, setFuelFilter] = useState<"all" | "Petrol" | "Diesel" | "Electric">("all");

    // modais
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selected, setSelected] = useState<Station | null>(null);

    // form
    const [form, setForm] = useState<Omit<Station, "id">>(EMPTY_FORM);

    const filtered = useMemo(() => {
        return stations.filter((s) => {
            const byText =
                !search ||
                s.name.toLowerCase().includes(search.toLowerCase()) ||
                s.address.toLowerCase().includes(search.toLowerCase());
            const byCity = cityFilter === "all" ? true : s.city === cityFilter;
            const byStatus = statusFilter === "all" ? true : s.status === statusFilter;
            const byFuel = fuelFilter === "all" ? true : s.fuelTypes.includes(fuelFilter);
            return byText && byCity && byStatus && byFuel;
        });
    }, [stations, search, cityFilter, statusFilter, fuelFilter]);

    // KPIs 
    const kpis = useMemo(() => {
        const total = stations.length;

        const petrol = stations.filter(s =>
            s.fuelTypes.some(f => f.toLowerCase() === "petrol")
        ).length;

        const diesel = stations.filter(s =>
            s.fuelTypes.some(f => f.toLowerCase() === "diesel")
        ).length;

        const twentyFour = stations.filter(s =>
            (s.openHours || "").toLowerCase().includes("24")
        ).length;

        return { total, petrol, diesel, twentyFour };
    }, [stations]);


    const is24h = (oh: string) => (oh || "").toLowerCase().includes("24");

    // ações
    function openCreate() {
        setForm(EMPTY_FORM);
        setCreateOpen(true);
    }
    function submitCreate() {
        const newS: Station = { id: `s${Date.now()}`, ...form };
        setStations((prev) => [newS, ...prev]);
        setCreateOpen(false);
        setForm(EMPTY_FORM);
    }
    function openEdit(s: Station) {
        setSelected(s);
        setForm({ ...s });
        setEditOpen(true);
    }
    function submitEdit() {
        if (!selected) return;
        setStations((prev) => prev.map((s) => (s.id === selected.id ? { ...selected, ...form } : s)));
        setEditOpen(false);
        setSelected(null);
    }
    function remove(s: Station) {
        setStations((prev) => prev.filter((x) => x.id !== s.id));
    }

    return (
        <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
            <div className="space-y-6">
                {/* título/descrição */}
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Gas Stations</h1>
                    <p className="text-muted-foreground">Manage and monitor gas stations in your corporate network.</p>
                </div>

                {/* KPIs (1º azul) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-[#1558E9] text-white border-transparent shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-white/80 text-sm font-medium">Total Gas Stations</p>
                                    <p className="text-3xl font-bold">{kpis.total}</p>
                                </div>
                                <Fuel className="h-8 w-8 text-white/90" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">Petrol Stations</p>
                                    <p className="text-3xl font-bold text-foreground">{kpis.petrol}</p>
                                </div>
                                <MapPin className="h-8 w-8 text-[#1558E9]" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">24/7 Stations</p>
                                    <p className="text-3xl font-bold text-foreground">{kpis.twentyFour}</p>
                                </div>
                                <Clock className="h-8 w-8 text-[#1558E9]" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/50 shadow-sm bg-card">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-muted-foreground text-sm font-medium">Diesel Stations</p>
                                    <p className="text-3xl font-bold text-foreground">{kpis.diesel}</p>
                                </div>
                                <Zap className="h-8 w-8 text-[#1558E9]" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex flex-wrap items-center gap-4">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[260px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-11 pl-10 bg-muted/30 border-border/50 focus:ring-2 focus:ring-[#1558E9] focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            {/* Filtros */}
                            <Select value={cityFilter} onValueChange={(v: any) => setCityFilter(v)}>
                                <SelectTrigger className="h-11 w-full md:w-[180px] border-border/50 shadow-sm">
                                    <SelectValue placeholder="City" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cities</SelectItem>
                                    <SelectItem value="Cityville">Cityville</SelectItem>
                                    <SelectItem value="Downtown">Downtown</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                <SelectTrigger className="h-11 w-full md:w-[180px] border-border/50 shadow-sm">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={fuelFilter} onValueChange={(v: any) => setFuelFilter(v)}>
                                <SelectTrigger className="h-11 w-full md:w-[180px] border-border/50 shadow-sm">
                                    <SelectValue placeholder="All Fuel Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Fuel Types</SelectItem>
                                    <SelectItem value="Petrol">Petrol</SelectItem>
                                    <SelectItem value="Diesel">Diesel</SelectItem>
                                    <SelectItem value="Electric">Electric</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Botão */}
                            <Button className="h-11 md:ml-auto bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm" onClick={openCreate}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Station
                            </Button>
                        </div>
                    </CardContent>
                </Card>


                {/* Lista + mapa */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Lista */}
                    <Card className="lg:col-span-2 border-border/50 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-foreground">Gas Station List</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-border/50">
                                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Name</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Location</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Fuel Types</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">24h?</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                                            <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((s) => (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-card/50">
                                                <td className="py-3 px-4 text-sm font-medium text-foreground">{s.name}</td>
                                                <td className="py-3 px-4 text-sm text-gray-700 flex items-center gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                                    {s.address}, {s.city}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-700">{s.fuelTypes.join(", ")}</td>
                                                <td className="py-3 px-4 text-sm text-gray-700">{is24h(s.openHours) ? "Yes" : "No"}</td>
                                                <td className="py-3 px-4">
                                                    <Badge className={statusChipClasses(s.status)}>{s.status}</Badge>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-border/50 bg-transparent"
                                                            onClick={() => openEdit(s)}
                                                        >
                                                            <Pencil className="h-4 w-4 mr-1" />
                                                            Edit
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-red-200 text-red-600 bg-transparent hover:bg-red-50"
                                                            onClick={() => remove(s)}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filtered.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                                                    No stations found with the selected filters.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mapa */}
                    <Card className="border-border/50 shadow-sm">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-foreground">Map View</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[420px] bg-card rounded-lg overflow-hidden">
                                <img
                                    src="/gas-station.png"
                                    alt="Gas stations map"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Modal: Create */}
                <Dialog
                    open={createOpen}
                    onOpenChange={(open) => {
                        setCreateOpen(open);
                        if (!open) setForm(EMPTY_FORM);
                    }}
                >
                    <DialogContent className="sm:max-w-[600px] bg-card border-border/50 shadow-xl">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <DialogTitle className="text-lg font-semibold text-foreground">New Station</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                                <Label className="text-sm text-gray-700">Nome</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    placeholder=""
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div>
                                <Label className="text-sm text-gray-700">Cidade</Label>
                                <Select value={(form.city || undefined) as any} onValueChange={(v: any) => setForm((p) => ({ ...p, city: v }))}>
                                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm">
                                        <SelectValue placeholder="Selecionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cityville">Cityville</SelectItem>
                                        <SelectItem value="Downtown">Downtown</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2">
                                <Label className="text-sm text-gray-700">Endereço</Label>
                                <Input
                                    value={form.address}
                                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                                    placeholder=""
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div>
                                <Label className="text-sm text-gray-700">Telefone</Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                                    placeholder=""
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div>
                                <Label className="text-sm text-gray-700">Horário</Label>
                                <Input
                                    value={form.openHours}
                                    onChange={(e) => setForm((p) => ({ ...p, openHours: e.target.value }))}
                                    placeholder="ex.: 24h, 06–22h"
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <Label className="text-sm text-gray-700">Tipos de Combustível (separados por vírgula)</Label>
                                <Input
                                    value={form.fuelTypes.join(", ")}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, fuelTypes: e.target.value ? e.target.value.split(",").map((x) => x.trim()) : [] }))
                                    }
                                    placeholder="Petrol, Diesel"
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div className="sm:col-span-2 flex items-center justify-between pt-1">
                                <Label className="text-sm text-gray-700">Ativo</Label>
                                <Switch
                                    checked={form.status === "Active"}
                                    onCheckedChange={(ch) => setForm((p) => ({ ...p, status: ch ? "Active" : "Inactive" }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="border-border/50">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                            </DialogClose>
                            <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90" onClick={submitCreate}>
                                Salvar Posto
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Modal: Edit */}
                <Dialog
                    open={editOpen}
                    onOpenChange={(open) => {
                        setEditOpen(open);
                        if (!open) setSelected(null);
                    }}
                >
                    <DialogContent className="sm:max-w-[600px] bg-card border-border/50 shadow-xl">
                        <DialogHeader className="flex flex-row items-center justify-between">
                            <DialogTitle className="text-lg font-semibold text-foreground">Edit Station</DialogTitle>
                        </DialogHeader>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                            <div>
                                <Label className="text-sm text-gray-700">Nome</Label>
                                <Input
                                    value={form.name}
                                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div>
                                <Label className="text-sm text-gray-700">Cidade</Label>
                                <Select value={(form.city || undefined) as any} onValueChange={(v: any) => setForm((p) => ({ ...p, city: v }))}>
                                    <SelectTrigger className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm">
                                        <SelectValue placeholder="Selecionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Cityville">Cityville</SelectItem>
                                        <SelectItem value="Downtown">Downtown</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:col-span-2">
                                <Label className="text-sm text-gray-700">Endereço</Label>
                                <Input
                                    value={form.address}
                                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div>
                                <Label className="text-sm text-gray-700">Telefone</Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div>
                                <Label className="text-sm text-gray-700">Horário</Label>
                                <Input
                                    value={form.openHours}
                                    onChange={(e) => setForm((p) => ({ ...p, openHours: e.target.value }))}
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <Label className="text-sm text-gray-700">Tipos de Combustível (separados por vírgula)</Label>
                                <Input
                                    value={form.fuelTypes.join(", ")}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, fuelTypes: e.target.value ? e.target.value.split(",").map((x) => x.trim()) : [] }))
                                    }
                                    className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                                />
                            </div>

                            <div className="sm:col-span-2 flex items-center justify-between pt-1">
                                <Label className="text-sm text-gray-700">Ativo</Label>
                                <Switch
                                    checked={form.status === "Active"}
                                    onCheckedChange={(ch) => setForm((p) => ({ ...p, status: ch ? "Active" : "Inactive" }))}
                                />
                            </div>
                        </div>

                        <div className="flex justify-between pt-4">
                            <DialogClose asChild>
                                <Button variant="outline" className="border-border/50">
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Back
                                </Button>
                            </DialogClose>
                            <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90" onClick={submitEdit}>
                                Save
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </RoleGuard>
    );
}
