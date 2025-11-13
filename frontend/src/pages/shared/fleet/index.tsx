import * as React from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
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
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, Plus, Trash2 } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { statusChipClasses } from "@/components/ui/status";

import { CarStatus, useCars, useCarMutations } from "@/hooks/use-cars";
import { useBranchesMap } from "@/hooks/use-branches-map";
import { toast } from "@/hooks/use-toast";

const COLORS = [
  "PRETO",
  "CINZA",
  "PRATA",
  "BRANCO",
  "VERMELHO",
  "OUTRO",
] as const;
const STATUSES: CarStatus[] = [
  "AVAILABLE",
  "IN_USE",
  "MAINTENANCE",
  "INACTIVE",
  "ACTIVE",
];
const UUID_V4 =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

// sentinelas para Radix
const STATUS_ALL = "__ALL_STATUS__";
const BRANCH_ALL = "__ALL_BRANCH__";

function mapStatusToChip(s: CarStatus) {
  switch (s) {
    case "AVAILABLE":
      return "Available";
    case "IN_USE":
      return "Reserved";
    case "MAINTENANCE":
      return "Maintenance";
    default:
      return "Unavailable";
  }
}

export default function FleetPage() {
  const navigate = useNavigate();
  const { data, refresh } = useCars();
  const cars = data ?? [];
  const { create, remove } = useCarMutations();

  // branches
  const { map: branchesMap } = useBranchesMap();
  const idToName = useMemo(() => {
    const dict: Record<string, string> = {};
    for (const [id, br] of Object.entries(branchesMap ?? {})) {
      dict[id] = (br as any)?.name ?? "";
    }
    return dict;
  }, [branchesMap]);
  const nameToId = useMemo(() => {
    const dict: Record<string, string> = {};
    for (const br of Object.values(branchesMap ?? {})) {
      const b: any = br;
      if (b?.name && b?.id) dict[b.name] = b.id;
    }
    return dict;
  }, [branchesMap]);
  const names = useMemo<string[]>(
    () =>
      Array.from(
        new Set(
          Object.values(branchesMap ?? {})
            .map((b: any) => b?.name)
            .filter(Boolean),
        ),
      ),
    [branchesMap],
  );

  // filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);
  const [branchFilterName, setBranchFilterName] = useState<string>(BRANCH_ALL);

  // modal criar
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    model: "",
    plate: "",
    color: "" as string,
    mileage: 0,
    status: "AVAILABLE" as CarStatus,
    branchName: "" as string,
  });

  // modal excluir (novo)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [removing, setRemoving] = useState(false);

  function resetForm() {
    setForm({
      model: "",
      plate: "",
      color: "",
      mileage: 0,
      status: "AVAILABLE",
      branchName: "",
    });
  }

  const kpis = useMemo(() => {
    const total = cars.length;
    return {
      total,
      available: cars.filter((c) => c.status === "AVAILABLE").length,
      reserved: cars.filter((c) => c.status === "IN_USE").length,
      maintenance: cars.filter((c) => c.status === "MAINTENANCE").length,
    };
  }, [cars]);

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    const branchNameFilter =
      branchFilterName === BRANCH_ALL ? "" : branchFilterName;
    const branchIdFilter = branchNameFilter
      ? nameToId[branchNameFilter]
      : undefined;
    const statusFilterVal =
      statusFilter === STATUS_ALL ? undefined : (statusFilter as CarStatus);

    return cars.filter((c) => {
      const branchName = idToName[c.branchId ?? ""] ?? "";
      const byText =
        !t ||
        c.model.toLowerCase().includes(t) ||
        c.plate.toLowerCase().includes(t) ||
        (c.color ?? "").toLowerCase().includes(t) ||
        branchName.toLowerCase().includes(t);

      const byStatus = statusFilterVal ? c.status === statusFilterVal : true;
      const byBranch = branchIdFilter ? c.branchId === branchIdFilter : true;

      return byText && byStatus && byBranch;
    });
  }, [cars, searchTerm, statusFilter, branchFilterName, idToName, nameToId]);

  async function onCreate() {
    if (saving) return;
    setSaving(true);
    try {
      const branchName = form.branchName || undefined;
      const candidateId = branchName ? nameToId[branchName] : undefined;
      const branchId =
        candidateId && UUID_V4.test(candidateId) ? candidateId : undefined;

      await create({
        plate: form.plate.toUpperCase(),
        model: form.model.trim(),
        color: form.color || undefined,
        mileage: Number.isFinite(form.mileage) ? form.mileage : 0,
        status: form.status,
        branchName,
        ...(branchId ? { branchId } : {}),
      });

      setOpen(false);
      resetForm();
      toast({ title: "Car created!" });
      await refresh({
        status:
          statusFilter === STATUS_ALL ? undefined : (statusFilter as CarStatus),
        branchId:
          branchFilterName === BRANCH_ALL
            ? undefined
            : nameToId[branchFilterName],
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast({
        variant: "destructive",
        description: Array.isArray(msg)
          ? msg.join("\n")
          : msg || "Erro ao criar carro",
      });
    } finally {
      setSaving(false);
    }
  }

  function onRemove(id: string, label: string) {
    setDeleteTarget({ id, label });
  }

  // confirmação do modal
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      setRemoving(true);
      await remove(deleteTarget.id);
      toast({ title: "Car deleted!" });
      await refresh({
        status:
          statusFilter === STATUS_ALL ? undefined : (statusFilter as CarStatus),
        branchId:
          branchFilterName === BRANCH_ALL
            ? undefined
            : nameToId[branchFilterName],
      });
    } catch (e: any) {
      const msg = e?.response?.data?.message;
      toast({
        variant: "destructive",
        description: Array.isArray(msg)
          ? msg.join("\n")
          : msg || "Erro ao remover carro",
      });
    } finally {
      setRemoving(false);
      setDeleteTarget(null);
    }
  }

  const uniqueBranchNames = useMemo(
    () => Array.from(new Set(names ?? [])) as string[],
    [names],
  );

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]}>
      <div className="space-y-6">
        {/* Header + Add */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Fleet Management
            </h1>
            <p className="text-muted-foreground">
              Manage your corporate vehicle fleet
            </p>
          </div>

          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px] border-border/50 shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-foreground">
                  New Vehicle
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Formulário para cadastrar um novo veículo.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2 col-span-2">
                  <Label>Model</Label>
                  <Input
                    placeholder="Onix 1.0"
                    value={form.model}
                    onChange={(e) =>
                      setForm({ ...form, model: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plate</Label>
                  <Input
                    placeholder="ABC1D23"
                    value={form.plate}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        plate: e.target.value.toUpperCase().slice(0, 7),
                      })
                    }
                    inputMode="text"
                    maxLength={7}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select
                    value={form.color || undefined}
                    onValueChange={(v) => setForm({ ...form, color: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {COLORS.map((c) => (
                        <SelectItem key={`clr-${c}`} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Mileage (km)</Label>
                  <Input
                    value={String(form.mileage)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D+/g, "");
                      setForm({
                        ...form,
                        mileage: raw ? parseInt(raw, 10) : 0,
                      });
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v: CarStatus) =>
                      setForm({ ...form, status: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={`st-${s}`} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Branch (by name)</Label>
                  <Select
                    value={form.branchName || undefined}
                    onValueChange={(v) => setForm({ ...form, branchName: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueBranchNames.map((n, i) => (
                        <SelectItem key={`branch-${i}-${n}`} value={n}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  onClick={onCreate}
                  disabled={saving}
                  className="bg-[#1558E9] hover:bg-[#1558E9]/90 shadow-sm disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save Vehicle"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              title: "Total Fleet",
              value: String(kpis.total),
              highlight: true,
            },
            { title: "Available", value: String(kpis.available) },
            { title: "Reserved", value: String(kpis.reserved) },
            { title: "Maintenance", value: String(kpis.maintenance) },
          ].map((k) => (
            <Card
              key={k.title}
              className={`border-border/50 shadow-sm ${k.highlight ? "bg-[#1558E9] text-white" : ""}`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className={`text-sm font-medium ${k.highlight ? "text-white/80" : "text-muted-foreground"}`}
                    >
                      {k.title}
                    </p>
                    <p
                      className={`text-2xl font-bold ${k.highlight ? "text-white" : "text-foreground"}`}
                    >
                      {k.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filtros (com botão Atualizar) */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[220px]">
                <Input
                  placeholder="Search by model, plate, color or branch…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={STATUS_ALL}>All Status</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={`flt-st-${s}`} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={branchFilterName}
                onValueChange={setBranchFilterName}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={BRANCH_ALL}>All Branches</SelectItem>
                  {uniqueBranchNames.map((n, i) => (
                    <SelectItem key={`flt-br-${i}-${n}`} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                type="button"
                onClick={() =>
                  refresh({
                    status:
                      statusFilter === STATUS_ALL
                        ? undefined
                        : (statusFilter as CarStatus),
                    branchId:
                      branchFilterName === BRANCH_ALL
                        ? undefined
                        : nameToId[branchFilterName],
                  })
                }
                className="bg-muted text-foreground hover:bg-muted/80"
              >
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Grid de cards com scroll próprio */}
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((v) => {
              const branchName = idToName[v.branchId ?? ""] ?? "-";
              return (
                <Card key={v.id} className="border-border/50 shadow-sm">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-foreground">
                          {v.model}
                        </h3>
                        <div className="flex items-center gap-3">
                          <Badge
                            className={statusChipClasses(
                              mapStatusToChip(v.status),
                            )}
                          >
                            {mapStatusToChip(v.status)}
                          </Badge>
                          <button
                            type="button"
                            aria-label="Excluir"
                            className="text-red-500 hover:text-red-600"
                            onClick={() => onRemove(v.id, v.model)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Plate</span>
                          <span className="text-foreground">{v.plate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Color</span>
                          <span className="text-foreground">
                            {v.color ?? "-"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Km</span>
                          <span className="text-foreground">
                            {v.mileage.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Branch</span>
                          <span className="text-foreground">{branchName}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-transparent border-border/50 hover:bg-card/50 shadow-sm"
                        onClick={() => navigate(`${v.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Dialog de confirmação de exclusão (padrão do projeto) */}
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(o) => {
            if (!removing) setDeleteTarget(o ? deleteTarget : null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover veículo</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja remover{" "}
                <strong>{deleteTarget?.label ?? "este veículo"}</strong>? Esta
                ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={removing}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={removing}
              >
                {removing ? "Removendo..." : "Remover"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
