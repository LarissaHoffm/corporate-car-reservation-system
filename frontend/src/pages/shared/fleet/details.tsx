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

type FleetStatus = "Available" | "Reserved" | "Maintenance" | "Unavailable";
type CarType = "SUV" | "SEDAN" | "HATCH";
type FuelType = "Petrol" | "Diesel" | "Electric";

type Vehicle = {
  id: string;
  model: string;
  plate: string;
  color: string;
  lastService: string;
  status: FleetStatus;
  type: CarType;
  fuel: FuelType;
  branch: string;
};

const FLEET_KEY = "fleet";
const BRANCHES = ["JLLE", "CWB", "MGA", "POA", "SP", "RJ", "CXS", "RBP", "Centro"] as const;

function statusClasses(s: FleetStatus) {
  switch (s) {
    case "Available": return "bg-green-100/60 text-green-700 border border-green-200";
    case "Reserved": return "bg-blue-100/60 text-blue-700 border border-blue-200";
    case "Maintenance": return "bg-orange-100/60 text-orange-700 border border-orange-200";
    default: return "bg-gray-100/60 text-gray-700 border border-gray-200";
  }
}

export default function CarInfo() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [isEditing, setIsEditing] = useState(false);
  const [car, setCar] = useState<Vehicle | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(FLEET_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as Vehicle[];
    const v = list.find((x) => x.id === id);
    if (v) setCar(v);
  }, [id]);

  const reservationHistory = useMemo(
    () => [
      { reservationId: "R2023001", userName: "Diana Prince", pickupDate: "2025-10-27", returnDate: "2025-10-27", status: "Completed" },
      { reservationId: "R2023008", userName: "Bruce Wayne",  pickupDate: "2025-10-28", returnDate: "2025-10-28", status: "Pending"   },
    ],
    []
  );

  const handleSave = () => {
    if (!car) return;
    const raw = localStorage.getItem(FLEET_KEY);
    if (!raw) return;
    const list = JSON.parse(raw) as Vehicle[];
    const updated = list.map((v) => (v.id === car.id ? car : v));
    localStorage.setItem(FLEET_KEY, JSON.stringify(updated));
    setIsEditing(false);
  };

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
              <h1 className="text-2xl font-bold text-foreground">Car Infos</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)} className="border-border/50">
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)} className="border-border/50">Cancel</Button>
                <Button className="bg-[#1558E9] hover:bg-[#1558E9]/90" onClick={handleSave}>Save</Button>
              </div>
            )}
          </div>
        </div>

        {/* Car Information */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* col 1 */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-[#1558E9] mb-4">Model</h3>
                  {isEditing ? (
                    <Input value={car.model} onChange={(e) => setCar({ ...car, model: e.target.value })} />
                  ) : (
                    <p className="text-foreground font-medium">{car.model}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Plate</Label>
                  {isEditing ? (
                    <Input value={car.plate} onChange={(e) => setCar({ ...car, plate: e.target.value.toUpperCase() })} />
                  ) : (
                    <p className="text-foreground">{car.plate}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Type</Label>
                  {isEditing ? (
                    <Select value={car.type} onValueChange={(v: CarType) => setCar({ ...car, type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUV">SUV</SelectItem>
                        <SelectItem value="SEDAN">SEDAN</SelectItem>
                        <SelectItem value="HATCH">HATCH</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-foreground">{car.type}</p>
                  )}
                </div>
              </div>

              {/* col 2 */}
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Color</Label>
                  {isEditing ? (
                    <Input value={car.color} onChange={(e) => setCar({ ...car, color: e.target.value })} />
                  ) : (
                    <p className="text-foreground">{car.color}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Fuel</Label>
                  {isEditing ? (
                    <Select value={car.fuel} onValueChange={(v: FuelType) => setCar({ ...car, fuel: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Petrol">Petrol</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Electric">Electric</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-foreground">{car.fuel}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Last Service</Label>
                  {isEditing ? (
                    <Input type="date" value={car.lastService} onChange={(e) => setCar({ ...car, lastService: e.target.value })} />
                  ) : (
                    <p className="text-foreground">{car.lastService}</p>
                  )}
                </div>
              </div>

              {/* col 3 */}
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Status</Label>
                  {isEditing ? (
                    <Select value={car.status} onValueChange={(v: FleetStatus) => setCar({ ...car, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="Reserved">Reserved</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Unavailable">Unavailable</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className={statusClasses(car.status)}>{car.status}</Badge>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700 mb-2">Branch</Label>
                  {isEditing ? (
                    <Select value={car.branch} onValueChange={(v: string) => setCar({ ...car, branch: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-foreground">{car.branch}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservation History (mock) */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-[#1558E9]">Reservation History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">RESERVATION ID</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">USER NAME</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">PICK-UP DATE</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">RETURN DATE</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {reservationHistory.map((r) => (
                    <tr key={r.reservationId} className="border-b border-gray-100/50">
                      <td className="py-3 px-4 text-sm text-foreground">{r.reservationId}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{r.userName}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{r.pickupDate}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{r.returnDate}</td>
                      <td className="py-3 px-4 text-sm text-foreground">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
