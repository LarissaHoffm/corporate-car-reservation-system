import * as React from "react";
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusChipClasses } from "@/components/ui/status";
import useReservations from "@/hooks/use-reservations";
import { ArrowLeft } from "lucide-react";

export default function RequesterReservationDetailsPage() {
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const { getReservation } = useReservations();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const r = await getReservation(id);
      setData(r);
    })();
  }, [id, getReservation]);

  if (!data) {
    return (
      <div className="mx-auto p-6 max-w-[900px]">
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Loading…
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-[900px] space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/requester/reservations">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="outline">
            Print
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Reservation Details</CardTitle>
            <Badge
              className={statusChipClasses(
                data.status === "PENDING"
                  ? "Warning"
                  : data.status === "APPROVED"
                    ? "Active"
                    : data.status === "COMPLETED"
                      ? "Success"
                      : "Inactive",
              )}
            >
              {data.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-muted-foreground">Origin</div>
            <div className="font-medium">{data.origin}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Destination</div>
            <div className="font-medium">{data.destination}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Start</div>
            <div className="font-medium">
              {new Date(data.startAt).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">End</div>
            <div className="font-medium">
              {new Date(data.endAt).toLocaleString()}
            </div>
          </div>
          {data.car && (
            <div>
              <div className="text-xs text-muted-foreground">Car</div>
              <div className="font-medium">
                {data.car.plate} — {data.car.model}
              </div>
            </div>
          )}
          {data.branch && (
            <div>
              <div className="text-xs text-muted-foreground">Branch</div>
              <div className="font-medium">{data.branch.name}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
