import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { RoleGuard } from "@/components/role-guard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { statusChipClasses } from "@/components/ui/status";

import { Car, CarStatus, useCar, useCarMutations } from "@/hooks/use-cars";
import { useBranchesMap } from "@/hooks/use-branches-map";
import { toast } from "@/hooks/use-toast";

const COLORS = ["PRETO", "CINZA", "PRATA", "BRANCO", "VERMELHO", "OUTRO"] as const;
const UUID_V4 = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export default function CarDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: car, refresh, setData } = useCar(id);
  const { update } = useCarMutations();
  const { idToName, nameToId, names } = useBranchesMap();

  const [isEditing, setEditing] = useState(false);
  const [form, setForm] = useState({
    model: "",
    plate: "",
    color: "",
    mileage: 0,
    status: "AVAILABLE" as CarStatus,
    branchName: "" as string,
  });

  useEffect(() => {
    if (!car) return;
    setForm({
      model: car.model,
      plate: car.plate,
      color: car.color ?? "",
      mileage: car.mileage,
      status: car.status,
      branchName: idToName[car.branchId ?? ""] ?? "",
    });
  }, [car, idToName]);

  const reservationHistory = useMemo(() => [], []);

  async function onSave() {
    if (!car) return;
    try {
      const branchName = form.branchName || undefined;
      const candidateId = branchName ? nameToId[branchName] : undefined;
      const branchId = candidateId && UUID_V4.test(candidateId) ? candidateId : undefined;

      const updated = await update(car.id, {
        plate: form.plate.toUpperCase(),
        model: form.model,
        color: form.color || undefined,
        mileage: Number.isFinite(form.mileage) ? form.mileage : 0,
        status: form.status,
        branchName,
        ...(branchId ? { branchId } : {}), // só envia se for UUID válido
      });

      setData(updated as Car);
      setEditing(false);
      toast.success("Car updated!");
      await refresh();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? "Error updating car";
      toast.error(Array.isArray(msg) ? msg.join("\n") : msg);
    }
  }

  if (!car) {
    return (
      <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
        <div className="space-y-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-card/50">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-8">
              <p className="text-muted-foreground">Vehicle not found.</p>
            </CardContent>
          </Card>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allowedRoles={["ADMIN", "APPROVER"]} requireAuth={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-card/50">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Car Information</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="outline" onClick={() => setEditing(true)} className="border-border/50">Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setEditing(false); refresh(); }} className="border-border/50">Cancel</Button>
                <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90" onClick={onSave}>Save</Button>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-6">
                <div>
                  <Label>Model</Label>
                  {isEditing ? (
                    <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                  ) : (<p className="text-foreground font-medium">{car.model}</p>)}
                </div>
                <div>
                  <Label>Plate</Label>
                  {isEditing ? (
                    <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase().slice(0,7) })} />
                  ) : (<p className="text-foreground">{car.plate}</p>)}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label>Color</Label>
                  {isEditing ? (
                    <Select value={form.color || undefined} onValueChange={(v) => setForm({ ...form, color: v })}>
                      <SelectTrigger><SelectValue placeholder="Select color" /></SelectTrigger>
                      <SelectContent>
                        {COLORS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (<p className="text-foreground">{car.color ?? "-"}</p>)}
                </div>
                <div>
                  <Label>Mileage (km)</Label>
                  {isEditing ? (
                    <Input
                      value={String(form.mileage)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D+/g, "");
                        setForm({ ...form, mileage: raw ? parseInt(raw, 10) : 0 });
                      }}
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  ) : (<p className="text-foreground">{car.mileage.toLocaleString()}</p>)}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label>Status</Label>
                  {isEditing ? (
                    <Select value={form.status} onValueChange={(v: CarStatus) => setForm({ ...form, status: v })}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                        <SelectItem value="IN_USE">IN_USE</SelectItem>
                        <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                        <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                        <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={statusChipClasses(
                      car.status === "AVAILABLE" ? "Available" :
                      car.status === "IN_USE" ? "Reserved" :
                      car.status === "MAINTENANCE" ? "Maintenance" : "Unavailable"
                    )}>
                      {car.status}
                    </Badge>
                  )}
                </div>

                <div>
                  <Label>Branch (by name)</Label>
                  {isEditing ? (
                    <Select value={form.branchName || undefined} onValueChange={(v) => setForm({ ...form, branchName: v })}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {(names ?? []).map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-foreground">{idToName[car.branchId ?? ""] ?? "-"}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Histórico (placeholder) */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#1558E9]">Reservation History</h2>
            </div>
            {reservationHistory.length === 0 ? (
              <p className="text-muted-foreground">No reservations.</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
