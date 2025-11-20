import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, GripVertical, X, Trash2 } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { statusChipClasses } from "@/components/ui/status";
import { api } from "@/lib/http/api";
import { useToast } from "@/components/ui/use-toast";

type ChecklistItemType = "BOOLEAN" | "NUMBER" | "TEXT" | "SELECT" | "PHOTO";

type ChecklistTemplateItem = {
  id: string;
  label: string;
  type: ChecklistItemType;
  required: boolean;
  order: number;
  options: any;
};

type ChecklistTemplate = {
  id: string;
  name: string;
  active: boolean;
  carId: string | null;
  createdAt: string;
  updatedAt: string;
  items: ChecklistTemplateItem[];
  car: {
    id: string;
    plate: string;
    model: string;
  } | null;
};

type CarSummary = {
  id: string;
  plate: string;
  model: string;
  status: string;
};

export default function AdminChecklistsPage() {
  const { toast } = useToast();

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [cars, setCars] = useState<CarSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [templateName, setTemplateName] = useState("");
  const [carId, setCarId] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [items, setItems] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // erro de formulário exibido ao lado dos botões
  const [formError, setFormError] = useState<string | null>(null);

  // helpers 

  const extractErrorMessage = (err: any, fallback: string) => {
    const res = err?.response;
    const msg = res?.data?.message;
    if (Array.isArray(msg) && msg.length) return msg[0];
    if (typeof msg === "string" && msg.trim().length) return msg;
    return fallback;
  };

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [tplRes, carsRes] = await Promise.all([
        api.get<ChecklistTemplate[]>("/checklists/templates", {
          params: { onlyActive: true },
        }),
        api.get("/cars"),
      ]);

      const tplData = tplRes.data ?? [];

      const rawCars = (carsRes.data ?? []) as any;
      const carsData: CarSummary[] = Array.isArray(rawCars)
        ? rawCars
        : (rawCars.items ?? []);

      setTemplates(tplData);
      setCars(carsData);
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao carregar checklists",
        description: extractErrorMessage(
          err,
          "Não foi possível carregar templates e carros.",
        ),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const carOptions = useMemo(
    () =>
      cars.map((c) => ({
        id: c.id,
        label: `${c.plate} • ${c.model}`,
      })),
    [cars],
  );

  const resolveCarLabel = (t: ChecklistTemplate) => {
    if (!t.car) return "-";
    return `${t.car.plate} • ${t.car.model}`;
  };

  //  modal open/close 

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setTemplateName("");
    setCarId("");
    setStatus("Active");
    setItems(["Tires", "Fuel", "Cleaning", "Mileage"]);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (t: ChecklistTemplate) => {
    setModalMode("edit");
    setEditingId(t.id);
    setTemplateName(t.name);
    setCarId(t.carId ?? "");
    setStatus(t.active ? "Active" : "Inactive");
    setItems(
      t.items.length
        ? [...t.items]
            .sort((a, b) => a.order - b.order)
            .map((it) => it.label)
        : ["Tires", "Fuel", "Cleaning", "Mileage"],
    );
    setFormError(null);
    setModalOpen(true);
  };

  //  excluir (desativar) 

  const removeTemplate = async (id: string) => {
    try {
      setDeletingId(id);

      await api.patch(`/checklists/templates/${id}/status`, {
        active: false,
      });

      await loadData();

      toast({
        title: "Template desativado",
        description: "O checklist foi marcado como inativo e removido da lista.",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro ao desativar template",
        description: extractErrorMessage(
          err,
          "Não foi possível desativar o checklist.",
        ),
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // salvar (create/edit) 

  const saveTemplate = async () => {
    const trimmedName = templateName.trim() || "Untitled";

    const effectiveItems = items
      .map((i) => i.trim())
      .filter((i) => i.length > 0);

    // limpa erro antes de validar
    setFormError(null);

    if (!carId) {
      const msg = "Selecione um carro para vincular o checklist.";
      setFormError(msg);
      toast({
        title: "Selecione um carro",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    if (!effectiveItems.length) {
      const msg = "Adicione pelo menos um item ao checklist.";
      setFormError(msg);
      toast({
        title: "Adicione ao menos um item",
        description: msg,
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: trimmedName,
      carId,
      active: status === "Active",
      items: effectiveItems.map((label, index) => ({
        label,
        type: "TEXT" as ChecklistItemType,
        required: true,
        order: index,
        options: null,
      })),
    };

    try {
      setSaving(true);

      if (modalMode === "create") {
        await api.post<ChecklistTemplate>("/checklists/templates", payload);
        toast({
          title: "Checklist criado",
          description: `Template "${trimmedName}" criado com sucesso.`,
        });
      } else if (modalMode === "edit" && editingId) {
        await api.put<ChecklistTemplate>(
          `/checklists/templates/${editingId}`,
          payload,
        );
        toast({
          title: "Checklist atualizado",
          description: `Template "${trimmedName}" atualizado.`,
        });
      }

      await loadData();
      setModalOpen(false);
    } catch (err: any) {
      console.error(err);
      const statusCode = err?.response?.status as number | undefined;
      const defaultMessage = extractErrorMessage(
        err,
        "Não foi possível salvar o checklist.",
      );

      if (statusCode === 409) {
        const msg =
          "Já existe um checklist vinculado a este carro. Edite o existente ou escolha outro veículo.";
        setFormError(msg);
        toast({
          title: "Carro já possui checklist",
          description: msg,
          variant: "destructive",
        });
      } else {
        setFormError(defaultMessage);
        toast({
          title: "Erro ao salvar template",
          description: defaultMessage,
          variant: "destructive",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  //  itens (add/update/remove/drag) 

  const addItem = () => setItems((p) => [...p, ""]);

  const updateItem = (i: number, v: string) =>
    setItems((p) => p.map((it, ix) => (ix === i ? v : it)));

  const removeItemAt = (i: number) =>
    setItems((p) => p.filter((_, ix) => ix !== i));

  const onDragStart = (i: number) => setDragIndex(i);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const onDrop = (i: number) => {
    if (dragIndex === null || dragIndex === i) return;
    setItems((p) => {
      const nx = [...p];
      const [m] = nx.splice(dragIndex, 1);
      nx.splice(i, 0, m);
      return nx;
    });
    setDragIndex(null);
  };

  //  modal JSX 

  const ChecklistModal = (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-md bg-card border-border/50 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {modalMode === "create"
              ? "Create Checklist Template"
              : "Edit Checklist Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label
              htmlFor="tpl-name"
              className="text-sm font-medium text-foreground"
            >
              Template Name *
            </Label>
            <Input
              id="tpl-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              className="border-border/50 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Linked Car Model
            </Label>
            <Select value={carId} onValueChange={setCarId}>
              <SelectTrigger className="border-border/50 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {carOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modalMode === "edit" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Status
              </Label>
              <div className="flex items-center gap-3">
                <Toggle
                  pressed={status === "Active"}
                  onPressedChange={(p) => setStatus(p ? "Active" : "Inactive")}
                  className="data-[state=on]:bg-green-500 data-[state=on]:text-white"
                >
                  {status}
                </Toggle>
                <span className="text-sm text-muted-foreground">
                  {status === "Active"
                    ? "Template is active"
                    : "Template is inactive"}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Checklist Items
            </Label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2"
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={onDragOver}
                  onDrop={() => onDrop(i)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  <Input
                    value={it}
                    onChange={(e) => updateItem(i, e.target.value)}
                    className="flex-1 border-border/50 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter checklist item"
                  />
                  {items.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={() => removeItemAt(i)}
                      className="text-muted-foreground hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={addItem}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-4">
          <div className="flex-1 min-h-[1.25rem]">
            {formError && (
              <p className="text-sm text-red-500">{formError}</p>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              type="button"
              onClick={() => setModalOpen(false)}
              className="border-border/50 text-muted-foreground hover:bg-card bg-transparent"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveTemplate}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  //  tabela 

  return (
    <RoleGuard allowedRoles={["ADMIN"]} requireAuth={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Checklist Templates
            </h1>
            <p className="text-muted-foreground">
              Create and manage reusable vehicle checklist templates.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Template
          </Button>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border/50 bg-card/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Template Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Car Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Created By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {templates.map((t) => {
                    const rowStatusLabel = t.active ? "Active" : "Inactive";

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-card/50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                          {t.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {resolveCarLabel(t)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {/* backend ainda não retorna "createdBy" */}
                          -
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {t.updatedAt
                            ? t.updatedAt.slice(0, 10)
                            : t.createdAt.slice(0, 10)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={statusChipClasses(rowStatusLabel)}>
                            {rowStatusLabel}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => openEdit(t)}
                              className="border-border/50 text-muted-foreground hover:bg-card hover:border-border"
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              type="button"
                              onClick={() => removeTemplate(t.id)}
                              className="border-border/50 text-red-600 hover:bg-red-50 hover:border-red-200"
                              disabled={deletingId === t.id}
                            >
                              {deletingId === t.id ? (
                                "..."
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && templates.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-muted-foreground"
                      >
                        No checklist templates found.
                      </td>
                    </tr>
                  )}
                  {loading && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-muted-foreground"
                      >
                        Loading checklists...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {ChecklistModal}
      </div>
    </RoleGuard>
  );
}
