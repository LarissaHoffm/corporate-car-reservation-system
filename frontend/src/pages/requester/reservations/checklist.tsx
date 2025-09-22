import * as React from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Upload, FileText, CheckCircle2 } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ReservStatus =
  | "Solicitado"
  | "Enviado p/ aprovação"
  | "Aprovado"
  | "Em Progresso"
  | "Concluída"
  | "Rejeitado"
  | "Cancelada";

type Reservation = { id: string; status: ReservStatus };

const LS_KEY = "reservcar:req:reservations";

function loadAll(): Reservation[] {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? (JSON.parse(s) as Reservation[]) : [];
  } catch {
    return [];
  }
}
function saveAll(v: Reservation[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(v));
}

const ITEMS = [
  { id: "tires", label: "Tires" },
  { id: "fuel", label: "Full Tank" },
  { id: "damages", label: "Damages" },
  { id: "cleaning", label: "Cleaning (inside/outside)" },
  { id: "m1", label: "Final Mileage" },
  { id: "m2", label: "Final Mileage" },
  { id: "m3", label: "Final Mileage" },
];

export default function RequesterReservationChecklist() {
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [obs, setObs] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleUpload = () => setFiles((p) => [...p, `photo-${Date.now()}.jpg`]);

  function submit() {
    const list = loadAll();
    const idx = list.findIndex((r) => r.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], status: "Concluída" };
      saveAll(list);
    }
    setShowSuccess(true);
  }

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Return Checklist</h1>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground mb-4">Mandatory Checklist</h3>
              <div className="space-y-3">
                {ITEMS.map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-3 rounded-lg border border-border/60 p-3 hover:bg-card/50"
                  >
                    <Checkbox
                      id={it.id}
                      checked={Boolean(checks[it.id])}
                      onCheckedChange={(v) => setChecks((p) => ({ ...p, [it.id]: Boolean(v) }))}
                      className="data-[state=checked]:border-[#1558E9] data-[state=checked]:bg-[#1558E9]"
                    />
                    <label htmlFor={it.id} className="text-sm font-medium text-foreground cursor-pointer">
                      {it.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground mb-2">Observations</h3>
              <Textarea
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Describe any issues or notes…"
                className="min-h-[120px]"
              />
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground mb-3">Photos</h3>
              <div className="rounded-lg border-2 border-dashed border-border/70 p-6 text-center">
                <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">Drag & drop here or click to upload</p>
                <Button variant="outline" onClick={() => handleUpload()} className="border-border bg-transparent">
                  Choose file
                </Button>
              </div>

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((f, i) => (
                    <div key={`${f}-${i}`} className="flex items-center gap-3 rounded-lg border border-border p-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90" onClick={submit}>
              Submit checklist
            </Button>
          </CardContent>
        </Card>

        <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Reservation finalized
              </DialogTitle>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              Your checklist was submitted and the reservation status is now <b>Concluída</b>.
            </div>
            <div className="pt-2 flex justify-end">
              <Button
                onClick={() => {
                  setShowSuccess(false);
                  navigate("/requester/reservations");
                }}
              >
                OK
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
