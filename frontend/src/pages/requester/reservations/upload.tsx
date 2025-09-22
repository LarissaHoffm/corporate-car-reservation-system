import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Upload, FileText, ArrowRight } from "lucide-react";

import { RoleGuard } from "@/components/role-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusChipClasses } from "@/components/ui/status";

type ReservStatus =
  | "Solicitado"
  | "Enviado p/ aprovação"
  | "Aprovado"
  | "Em Progresso"
  | "Concluída"
  | "Rejeitado"
  | "Cancelada";

type Reservation = { id: string; status: ReservStatus; carModel: string; plate: string };

const LS_KEY = "reservcar:req:reservations";

function loadOne(id: string): Reservation | null {
  try {
    const s = localStorage.getItem(LS_KEY);
    if (!s) return null;
    const list = JSON.parse(s) as any[];
    const r = list.find((x) => x.id === id);
    return r ? { id: r.id, status: r.status, carModel: r.carModel, plate: r.plate } : null;
  } catch {
    return null;
  }
}

export default function RequesterReservationUpload() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const data = loadOne(id);

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Upload Documents — #{id}</h1>
          {data && <Badge className={statusChipClasses(data.status as any)}>{data.status}</Badge>}
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Driver Documents</h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {["Driver License (front & back)", "Insurance Proof"].map((label) => (
                  <div
                    key={label}
                    className="cursor-pointer rounded-lg border-2 border-dashed border-border/60 p-6 text-center hover:border-[#1558E9]"
                  >
                    <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-base font-semibold text-foreground">Vehicle Documents</h3>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {["Fuel Receipt", "Damage Photos (if any)"].map((label) => (
                  <div
                    key={label}
                    className="cursor-pointer rounded-lg border-2 border-dashed border-border/60 p-6 text-center hover:border-[#1558E9]"
                  >
                    <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Uploaded Files</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded border border-border bg-card p-3 text-foreground">
                  <FileText className="h-4 w-4 text-[#1558E9]" />
                  <span className="text-sm">license_front.jpg</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-border bg-card p-3 text-foreground">
                  <FileText className="h-4 w-4 text-[#1558E9]" />
                  <span className="text-sm">fuel_receipt.pdf</span>
                </div>
              </div>
            </div>

            <Button
              className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90"
              onClick={() => navigate(`/requester/reservations/${id}/checklist`)}
            >
              Continue to Checklist <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
