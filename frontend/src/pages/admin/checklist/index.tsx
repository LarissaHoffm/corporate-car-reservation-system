import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Plus, GripVertical, X, Trash2 } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { statusChipClasses } from "@/components/ui/status";

type Template = {
  id: string;
  templateName: string;
  carModel: string;
  createdBy: string;
  lastUpdated: string;
  status: "Active" | "Inactive";
  items: string[];
};

// Persistência MVP 
const LS_KEY = "rc:checklists:v1";
const readTemplates = (): Template[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Template[]) : [];
  } catch {
    return [];
  }
};
const writeTemplates = (data: Template[]) => localStorage.setItem(LS_KEY, JSON.stringify(data));

const seed: Template[] = [
  { id: "1", templateName: "Standard Vehicle Check", carModel: "All Models", createdBy: "Alex Morgan", lastUpdated: "2023-10-15", status: "Active", items: ["Tires", "Fuel", "Cleaning", "Mileage"] },
  { id: "2", templateName: "Luxury Vehicle Check",   carModel: "BMW X5",     createdBy: "Alex Morgan", lastUpdated: "2023-10-14", status: "Active", items: ["Tires", "Fuel", "Cleaning", "Mileage"] },
  { id: "3", templateName: "Electric Vehicle Check",  carModel: "Tesla Model 3", createdBy: "Alex Morgan", lastUpdated: "2023-10-13", status: "Active", items: ["Tires", "Fuel", "Cleaning", "Mileage"] },
  { id: "4", templateName: "Sedan Inspection",        carModel: "Honda Civic", createdBy: "Alex Morgan", lastUpdated: "2023-10-12", status: "Active", items: ["Tires", "Fuel", "Cleaning", "Mileage"] },
  { id: "5", templateName: "SUV Maintenance",         carModel: "Toyota RAV4", createdBy: "Alex Morgan", lastUpdated: "2023-10-11", status: "Active", items: ["Tires", "Fuel", "Cleaning", "Mileage"] },
  { id: "6", templateName: "Truck Inspection",        carModel: "Ford F-150",  createdBy: "Alex Morgan", lastUpdated: "2023-10-10", status: "Active", items: ["Tires", "Fuel", "Cleaning", "Mileage"] },
];


export default function AdminChecklistsPage() {
  const [templates, setTemplates] = useState<Template[]>(() => {
    const ls = readTemplates();
    if (ls.length) return ls;
    writeTemplates(seed);
    return seed;
  });
  useEffect(() => writeTemplates(templates), [templates]);

  const carModels = useMemo(
    () => ["All Models", "BMW X5", "Tesla Model 3", "Honda Civic", "Toyota RAV4", "Ford F-150"],
    []
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  const [templateName, setTemplateName] = useState("");
  const [carModel, setCarModel] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [items, setItems] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setTemplateName("");
    setCarModel("");
    setStatus("Active");
    setItems(["Tires", "Fuel", "Cleaning", "Mileage"]);
    setModalOpen(true);
  };

  const openEdit = (t: Template) => {
    setModalMode("edit");
    setEditingId(t.id);
    setTemplateName(t.templateName);
    setCarModel(t.carModel);
    setStatus(t.status);
    setItems(t.items.length ? t.items : ["Tires", "Fuel", "Cleaning", "Mileage"]);
    setModalOpen(true);
  };

  const removeTemplate = (id: string) => setTemplates((prev) => prev.filter((t) => t.id !== id));

  const saveTemplate = () => {
    const today = new Date().toISOString().split("T")[0];
    if (modalMode === "create") {
      const id = crypto.randomUUID?.() ?? String(Date.now());
      const newT: Template = {
        id,
        templateName: templateName.trim() || "Untitled",
        carModel: carModel || "All Models",
        createdBy: "Current User",
        lastUpdated: today,
        status: "Active",
        items: items.filter((i) => i.trim() !== ""),
      };
      setTemplates((p) => [...p, newT]);
    } else if (modalMode === "edit" && editingId) {
      setTemplates((p) =>
        p.map((t) =>
          t.id === editingId
            ? {
                ...t,
                templateName: templateName.trim() || "Untitled",
                carModel: carModel || "All Models",
                lastUpdated: today,
                status,
                items: items.filter((i) => i.trim() !== ""),
              }
            : t
        )
      );
    }
    setModalOpen(false);
  };

  //add/update/remove/drag 
  const addItem = () => setItems((p) => [...p, ""]);
  const updateItem = (i: number, v: string) => setItems((p) => p.map((it, ix) => (ix === i ? v : it)));
  const removeItem = (i: number) => setItems((p) => p.filter((_, ix) => ix !== i));

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

  const ChecklistModal = (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogContent className="max-w-md bg-card border-border/50 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {modalMode === "create" ? "Create Checklist Template" : "Edit Checklist Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name" className="text-sm font-medium text-foreground">
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
            <Label className="text-sm font-medium text-foreground">Linked Car Model</Label>
            <Select value={carModel} onValueChange={setCarModel}>
              <SelectTrigger className="border-border/50 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                {carModels.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {modalMode === "edit" && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Status</Label>
              <div className="flex items-center gap-3">
                <Toggle
                  pressed={status === "Active"}
                  onPressedChange={(p) => setStatus(p ? "Active" : "Inactive")}
                  className="data-[state=on]:bg-green-500 data-[state=on]:text-white"
                >
                  {status}
                </Toggle>
                <span className="text-sm text-muted-foreground">
                  {status === "Active" ? "Template is active" : "Template is inactive"}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Checklist Items</Label>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div
                  key={`${i}-${it}`}
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
                      onClick={() => removeItem(i)}
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

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            type="button"
            onClick={() => setModalOpen(false)}
            className="border-border/50 text-muted-foreground hover:bg-card bg-transparent"
          >
            Cancel
          </Button>
          <Button type="button" onClick={saveTemplate} className="bg-blue-600 hover:bg-blue-700 text-white">
            Save Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Tabela 
  return (
    <RoleGuard allowedRoles={["ADMIN"]} requireAuth={false}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Checklist Templates</h1>
            <p className="text-muted-foreground">Create and manage reusable vehicle checklist templates.</p>
          </div>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
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
                  {templates.map((t) => (
                    <tr key={t.id} className="hover:bg-card/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{t.templateName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{t.carModel}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{t.createdBy}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{t.lastUpdated}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={statusChipClasses(t.status)}>{t.status}</Badge>
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
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
