import * as React from "react";
import { useMemo, useState, useEffect } from "react";
import {
  Fuel,
  MapPin,
  Clock,
  Zap,
  Plus,
  Search,
  Pencil,
  Trash2,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { statusChipClasses } from "@/components/ui/status";

import useStations from "@/hooks/use-stations";
import type {
  Station as ApiStation,
  StationInput as ApiStationInput,
} from "@/lib/http/stations";
import useStationCities from "@/hooks/use-stations.cities";

/* ------------------------- Tipos e constantes ------------------------- */
type StationStatus = "Active" | "Inactive";
const FUEL_OPTIONS = ["Petrol", "Diesel", "Electric"] as const;

type Station = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string;
  openHours: string; // mantido no tipo, mas não exibido nos modais
  fuelTypes: string[];
  status: StationStatus;
  is24h?: boolean;
};

const EMPTY_FORM: Omit<Station, "id"> = {
  name: "",
  address: "",
  city: "",
  phone: "",
  openHours: "",
  fuelTypes: [],
  status: "Active",
  is24h: false,
};

const DEFAULT_UF = "SC";

/* ------------------------- Persistência local (meta) ------------------------- */
type StationMeta = {
  fuelTypes?: string[];
  is24h?: boolean;
  phone?: string;
  status?: StationStatus;
};
const META_KEY = "stations_meta_v1";
const loadMetaMap = () => {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || "{}");
  } catch {
    return {};
  }
};
const saveMetaMap = (m: Record<string, StationMeta>) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* empty */
  }
};
const upsertMeta = (id: string, patch: StationMeta) => {
  const m = loadMetaMap();
  m[id] = { ...(m[id] || {}), ...patch };
  saveMetaMap(m);
};
const removeMeta = (id: string) => {
  const m = loadMetaMap();
  delete m[id];
  saveMetaMap(m);
};

/* ------------------------- Página ------------------------- */
export default function SharedGasStationsPage() {
  const {
    items: apiItems,
    loading,
    onSearch: onSearchApi,
    setQuery,
    createStation,
    updateStation,
    removeStation,
    refresh,
  } = useStations();
  const { selectItems: cityItems, loading: citiesLoading } = useStationCities();

  const stations: Station[] = useMemo(() => {
    const metaMap = loadMetaMap();
    return (apiItems || []).map((s: ApiStation) => {
      const m = metaMap[s.id] || {};
      return {
        id: s.id,
        name: s.name,
        address: s.address ?? "",
        city: (s as any).city ?? "",
        phone: m.phone ?? "",
        openHours: "",
        fuelTypes: m.fuelTypes ?? [],
        status:
          (m.status as StationStatus | undefined) ??
          (s.isActive ? "Active" : "Inactive"),
        is24h: m.is24h ?? false,
      };
    });
  }, [apiItems]);

  // filtros
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | StationStatus>(
    "all",
  );
  const [fuelFilter, setFuelFilter] = useState<
    "all" | "Petrol" | "Diesel" | "Electric"
  >("all");

  // seleção de posto para o mapa
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  );

  // modais
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Station | null>(null);
  const [toDelete, setToDelete] = useState<Station | null>(null);

  // form
  const [form, setForm] = useState<Omit<Station, "id">>(EMPTY_FORM);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    onSearchApi(v);
  };
  const handleCityFilter = (v: string) => {
    setCityFilter(v);
    setQuery({ city: v === "all" ? "" : v });
  };

  const filtered = useMemo(
    () =>
      stations.filter((s) => {
        const byText =
          !search ||
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.address.toLowerCase().includes(search.toLowerCase());
        const byCity = cityFilter === "all" ? true : s.city === cityFilter;
        const byStatus =
          statusFilter === "all" ? true : s.status === statusFilter;
        const byFuel =
          fuelFilter === "all" ? true : s.fuelTypes.includes(fuelFilter);
        return byText && byCity && byStatus && byFuel;
      }),
    [stations, search, cityFilter, statusFilter, fuelFilter],
  );

  // garante um posto selecionado quando a lista muda
  useEffect(() => {
    if (!filtered.length) {
      setSelectedStationId(null);
      return;
    }
    setSelectedStationId((prev) =>
      prev && filtered.some((s) => s.id === prev) ? prev : filtered[0].id,
    );
  }, [filtered]);

  const selectedStation = useMemo(
    () => filtered.find((s) => s.id === selectedStationId) ?? null,
    [filtered, selectedStationId],
  );

  const kpis = useMemo(() => {
    const total = stations.length;
    const petrol = stations.filter((s) =>
      s.fuelTypes.some((f) => f.toLowerCase() === "petrol"),
    ).length;
    const diesel = stations.filter((s) =>
      s.fuelTypes.some((f) => f.toLowerCase() === "diesel"),
    ).length;
    const twentyFour = stations.filter((s) => !!s.is24h).length;
    return { total, petrol, diesel, twentyFour };
  }, [stations]);

  // ações CRUD
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };
  const submitCreate = async () => {
    const payload: ApiStationInput = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      state: DEFAULT_UF,
    } as any;
    const created = await createStation(payload);
    if (created)
      upsertMeta(created.id, {
        phone: form.phone,
        fuelTypes: form.fuelTypes,
        is24h: !!form.is24h,
        status: form.status,
      });
    await refresh();
    setCreateOpen(false);
    setForm(EMPTY_FORM);
  };
  const openEdit = (s: Station) => {
    setSelected(s);
    setForm({ ...s });
    setEditOpen(true);
  };
  const submitEdit = async () => {
    if (!selected) return;
    const payload: ApiStationInput = {
      name: form.name.trim(),
      address: form.address.trim() || undefined,
      state: DEFAULT_UF,
      isActive: form.status === "Active",
    } as any;
    await updateStation(selected.id, payload);
    upsertMeta(selected.id, {
      phone: form.phone,
      fuelTypes: form.fuelTypes,
      is24h: !!form.is24h,
      status: form.status,
    });
    await refresh();
    setEditOpen(false);
    setSelected(null);
  };
  const askDelete = (s: Station) => {
    setToDelete(s);
    setDeleteOpen(true);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    await removeStation(toDelete.id);
    removeMeta(toDelete.id);
    await refresh();
    setDeleteOpen(false);
    setToDelete(null);
  };

  const toggleFuel = (v: string) =>
    setForm((p) => ({
      ...p,
      fuelTypes: p.fuelTypes.includes(v)
        ? p.fuelTypes.filter((f) => f !== v)
        : [...p.fuelTypes, v],
    }));
  const is24h = (b?: boolean) => !!b;

  // ------------------------ Google Maps (embed por posto) ------------------------
  const mapsApiKey =
    (import.meta as any)?.env?.VITE_GOOGLE_MAPS_EMBED_KEY ??
    (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY ??
    null;

  const mapQuery = useMemo(() => {
    if (!selectedStation) return null;

    const parts = [
      selectedStation.address || "",
      selectedStation.city || "",
      selectedStation.city ? DEFAULT_UF : "",
    ]
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length === 0) {
      // fallback mínimo: nome do posto
      return selectedStation.name;
    }

    return parts.join(", ");
  }, [selectedStation]);

  // Se tiver key -> usa embed oficial; se não, usa embed genérico sem key
  const mapApiSrc =
    mapsApiKey && mapQuery
      ? `https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(
          mapQuery,
        )}`
      : null;

  const mapFallbackSrc = mapQuery
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        mapQuery,
      )}&output=embed`
    : null;

  const mapSrc = mapApiSrc ?? mapFallbackSrc;

  const handleOpenSelectedInMaps = () => {
    if (!mapQuery) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      mapQuery,
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* título */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gas Stations</h1>
          <p className="text-muted-foreground">
            Manage and monitor gas stations in your corporate network.
          </p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#1558E9] text-white border-transparent shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">
                    Total Gas Stations
                  </p>
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
                  <p className="text-muted-foreground text-sm font-medium">
                    Petrol Stations
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {kpis.petrol}
                  </p>
                </div>
                <MapPin className="h-8 w-8 text-[#1558E9]" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    24/7 Stations
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {kpis.twentyFour}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-[#1558E9]" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Diesel Stations
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {kpis.diesel}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-[#1558E9]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* filtros */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[260px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-11 pl-10 bg-muted/30 border-border/50 focus:ring-2 focus:ring-[#1558E9] focus:border-[#1558E9] shadow-sm"
                />
              </div>

              <Select
                value={cityFilter}
                onValueChange={(v: string) => handleCityFilter(v)}
              >
                <SelectTrigger className="h-11 w-full md:w-[180px] border-border/50 shadow-sm">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  {citiesLoading ? (
                    <>
                      <SelectItem value="all">All Cities</SelectItem>
                      <SelectItem value="__loading" disabled>
                        Loading...
                      </SelectItem>
                    </>
                  ) : (
                    (cityItems.length ? cityItems : ["all"]).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c === "all" ? "All Cities" : c}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v: any) => setStatusFilter(v)}
              >
                <SelectTrigger className="h-11 w-full md:w-[180px] border-border/50 shadow-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={fuelFilter}
                onValueChange={(v: any) => setFuelFilter(v)}
              >
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

              <Button
                className="h-11 md:ml-auto bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm"
                onClick={openCreate}
                disabled={loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Station
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Lista + Mapa */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">
                  Gas Station List
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                  className="border-border/50"
                  title="Atualizar lista"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Location
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Fuel Types
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        24h?
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedStationId(s.id)}
                        className={`border-b border-gray-100 hover:bg-card/50 cursor-pointer ${
                          selectedStationId === s.id
                            ? "bg-blue-50/60"
                            : ""
                        }`}
                      >
                        <td className="py-3 px-4 text-sm font-medium text-foreground">
                          {s.name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          {s.address}
                          {s.address && s.city ? ", " : ""}
                          {s.city}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {s.fuelTypes.length ? s.fuelTypes.join(", ") : "—"}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700">
                          {is24h(s.is24h) ? "Yes" : "No"}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={statusChipClasses(s.status)}>
                            {s.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-border/50 bg-transparent"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(s);
                              }}
                              disabled={loading}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-red-600 bg-transparent hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                askDelete(s);
                              }}
                              disabled={loading}
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
                        <td
                          colSpan={6}
                          className="py-6 text-center text-sm text-muted-foreground"
                        >
                          No stations found with the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Mapa dinâmico por posto */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-foreground">Map View</CardTitle>
                {selectedStation && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Visualizando:{" "}
                    <span className="font-medium">
                      {selectedStation.name}
                    </span>
                  </p>
                )}
              </div>
              {selectedStation && mapQuery && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border/50"
                  onClick={handleOpenSelectedInMaps}
                >
                  <MapPin className="h-4 w-4 mr-1" />
                  Open in Maps
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-[420px] bg-card rounded-lg overflow-hidden">
                {mapSrc ? (
                  <iframe
                    title="Station map"
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={mapSrc}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center px-4 text-sm text-muted-foreground text-center">
                    {!selectedStation
                      ? "Nenhum posto selecionado."
                      : "Endereço do posto não informado. Preencha o endereço para visualizar o mapa."}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modal: Create (sem campo Cidade) */}
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setForm(EMPTY_FORM);
          }}
        >
          <DialogContent className="sm:max-w-[600px] bg-card border-border/50 shadow-xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-foreground">
                New Station
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Label className="text-sm text-gray-700">Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-gray-700">Endereço</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700">Telefone</Label>
                <Input
                  value={form.phone}
                  inputMode="numeric"
                  pattern="\d*"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      phone: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                <Label className="text-sm text-gray-700">24 horas?</Label>
                <Switch
                  checked={!!form.is24h}
                  onCheckedChange={(ch) =>
                    setForm((p) => ({ ...p, is24h: !!ch }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-gray-700">
                  Tipos de Combustível
                </Label>
                <div className="flex gap-2 mt-1">
                  <Select onValueChange={(v) => toggleFuel(v)}>
                    <SelectTrigger className="w-[220px] border-border/50 shadow-sm">
                      <SelectValue placeholder="Adicionar tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_OPTIONS.map((o) => (
                        <SelectItem key={`fuel-${o}`} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {form.fuelTypes.map((ft) => (
                      <Badge
                        key={`chip-${ft}`}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleFuel(ft)}
                      >
                        {ft} <span className="ml-1 opacity-70">×</span>
                      </Badge>
                    ))}
                    {form.fuelTypes.length === 0 && (
                      <span className="text-xs text-muted-foreground self-center">
                        Nenhum tipo selecionado
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                <Label className="text-sm text-gray-700">Ativo</Label>
                <Switch
                  checked={form.status === "Active"}
                  onCheckedChange={(ch) =>
                    setForm((p) => ({
                      ...p,
                      status: ch ? "Active" : "Inactive",
                    }))
                  }
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
            <Button
                className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                onClick={submitCreate}
                disabled={loading}
              >
                Salvar Posto
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Edit (sem campo Cidade) */}
        <Dialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setSelected(null);
          }}
        >
          <DialogContent className="sm:max-w-[600px] bg-card border-border/50 shadow-xl">
            <DialogHeader className="flex flex-row items-center justify-between">
              <DialogTitle className="text-lg font-semibold text-foreground">
                Edit Station
              </DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Label className="text-sm text-gray-700">Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-gray-700">Endereço</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, address: e.target.value }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-700">Telefone</Label>
                <Input
                  value={form.phone}
                  inputMode="numeric"
                  pattern="\d*"
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      phone: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  className="mt-1 border-border/50 focus:border-[#1558E9] shadow-sm"
                />
              </div>
              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                <Label className="text-sm text-gray-700">24 horas?</Label>
                <Switch
                  checked={!!form.is24h}
                  onCheckedChange={(ch) =>
                    setForm((p) => ({ ...p, is24h: !!ch }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-sm text-gray-700">
                  Tipos de Combustível
                </Label>
                <div className="flex gap-2 mt-1">
                  <Select onValueChange={(v) => toggleFuel(v)}>
                    <SelectTrigger className="w-[220px] border-border/50 shadow-sm">
                      <SelectValue placeholder="Adicionar tipo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FUEL_OPTIONS.map((o) => (
                        <SelectItem key={`fuel-edit-${o}`} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex flex-wrap gap-2">
                    {form.fuelTypes.map((ft) => (
                      <Badge
                        key={`chip-edit-${ft}`}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => toggleFuel(ft)}
                      >
                        {ft} <span className="ml-1 opacity-70">×</span>
                      </Badge>
                    ))}
                    {form.fuelTypes.length === 0 && (
                      <span className="text-xs text-muted-foreground self-center">
                        Nenhum tipo selecionado
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2 flex items-center justify-between pt-1">
                <Label className="text-sm text-gray-700">Ativo</Label>
                <Switch
                  checked={form.status === "Active"}
                  onCheckedChange={(ch) =>
                    setForm((p) => ({
                      ...p,
                      status: ch ? "Active" : "Inactive",
                    }))
                  }
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
              <Button
                className="bg-[#1558E9] hover:bg-[#1558E9]/90"
                onClick={submitEdit}
                disabled={loading}
              >
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog padrão de remoção */}
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir posto?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. O posto{" "}
                <span className="font-medium">{toDelete?.name}</span> será
                removido permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteOpen(false)}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </RoleGuard>
  );
}
