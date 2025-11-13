import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { statusChipClasses } from "@/components/ui/status";
import {
  ArrowRight,
  Eye,
  Loader2,
  RefreshCcw,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import useReservations from "@/hooks/use-reservations";

type QuickRange = "TODAY" | "7D" | "30D" | "ALL";

function toDateInputValue(d: Date) {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
}

export default function RequesterReservationsListPage() {
  const navigate = useNavigate();
  const {
    myItems,
    loading,
    errors,
    refreshMy,
    cancelReservation,
    completeReservation,
  } = useReservations();

  const [q, setQ] = useState("");
  const [range, setRange] = useState<QuickRange>("7D");
  const [status, setStatus] = useState<
    "ALL" | "PENDING" | "APPROVED" | "CANCELED" | "COMPLETED"
  >("ALL");

  useEffect(() => {
    refreshMy();
  }, [refreshMy]);

  const filtered = useMemo(() => {
    const now = new Date();
    const startLimit =
      range === "TODAY"
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : range === "7D"
          ? new Date(now.getTime() - 7 * 24 * 3600 * 1000)
          : range === "30D"
            ? new Date(now.getTime() - 30 * 24 * 3600 * 1000)
            : null;

    return (myItems ?? [])
      .filter((r) => {
        if (status !== "ALL" && r.status !== status) return false;
        if (q) {
          const t = q.toLowerCase();
          if (
            !(
              r.origin?.toLowerCase().includes(t) ||
              r.destination?.toLowerCase().includes(t)
            )
          )
            return false;
        }
        if (startLimit) {
          const st = new Date(r.startAt);
          if (st < startLimit) return false;
        }
        return true;
      })
      .sort(
        (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
      );
  }, [myItems, q, status, range]);

  async function onCancel(id: string) {
    await cancelReservation(id);
    await refreshMy();
  }

  async function onComplete(id: string) {
    await completeReservation(id);
    await refreshMy();
  }

  return (
    <div className="mx-auto p-6 max-w-[1400px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">My Reservations</h1>
          <p className="text-sm text-muted-foreground">
            View and manage your recent requests.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={refreshMy} variant="outline">
            {loading.my ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            onClick={() => navigate("/requester/reservations/new")}
            className="bg-[#1558E9] hover:bg-[#1558E9]/90"
          >
            New Reservation
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Search</Label>
            <Input
              placeholder="Origin or destination…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select
              value={range}
              onValueChange={(v: QuickRange) => setRange(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAY">Today</SelectItem>
                <SelectItem value="7D">Last 7 days</SelectItem>
                <SelectItem value="30D">Last 30 days</SelectItem>
                <SelectItem value="ALL">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="CANCELED">Canceled</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Results ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading.my ? (
            <div className="py-10 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-sm text-muted-foreground">
              No reservations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-3 px-4">Origin</th>
                    <th className="text-left py-3 px-4">Destination</th>
                    <th className="text-left py-3 px-4">Period</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/50 hover:bg-background"
                    >
                      <td className="py-3 px-4">{r.origin}</td>
                      <td className="py-3 px-4">{r.destination}</td>
                      <td className="py-3 px-4">
                        {new Date(r.startAt).toLocaleString()}{" "}
                        <ArrowRight className="inline h-3 w-3 mx-1" />
                        {new Date(r.endAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={statusChipClasses(
                            r.status === "PENDING"
                              ? "Warning"
                              : r.status === "APPROVED"
                                ? "Active"
                                : r.status === "COMPLETED"
                                  ? "Success"
                                  : "Inactive",
                          )}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/requester/reservations/details?id=${r.id}`}
                          >
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" /> Details
                            </Button>
                          </Link>

                          {r.status === "APPROVED" && (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => onComplete(r.id)}
                              disabled={loading.complete}
                            >
                              {loading.complete ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                              )}
                              Conclude
                            </Button>
                          )}

                          {(r.status === "PENDING" ||
                            r.status === "APPROVED") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onCancel(r.id)}
                              disabled={loading.cancel}
                            >
                              {loading.cancel ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4 mr-2" />
                              )}
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {errors.list && (
                <p className="text-xs text-red-600 mt-3">{errors.list}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Today: {toDateInputValue(new Date())}
      </p>
    </div>
  );
}
