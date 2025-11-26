import * as React from "react";
import {
  BarChart3,
  Users,
  Car,
  Calendar,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { RoleGuard } from "@/components/role-guard";
import api from "@/lib/http/api";
import { useToast } from "@/components/ui/use-toast";

type MySummary = {
  totalReservations: number;
  pendingApproval: number;
  completedTrips: number;
  canceledReservations: number;
};

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return n.toString();
}

function parseFilenameFromDisposition(disposition?: string): string | null {
  if (!disposition) return null;
  const match = /filename="?([^"]+)"?/i.exec(disposition);
  return match?.[1] ?? null;
}

export default function RequesterReportsPage() {
  const { toast } = useToast();

  const [summary, setSummary] = React.useState<MySummary | null>(null);
  const [loadingSummary, setLoadingSummary] = React.useState<boolean>(true);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setSummaryError(null);
        const res = await api.get<MySummary>("/reports/my-reservations/summary");
        if (!cancelled) {
          setSummary(res.data);
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg =
            err?.userMessage ||
            err?.message ||
            "Não foi possível carregar o resumo de relatórios.";
          setSummaryError(msg);
        }
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadCsv = React.useCallback(
    async (url: string, defaultName: string) => {
      try {
        const res = await api.get(url, {
          responseType: "blob",
        });

        const blob = new Blob([res.data], {
          type: "text/csv;charset=utf-8",
        });

        const disposition = res.headers["content-disposition"] as
          | string
          | undefined;
        const filename =
          parseFilenameFromDisposition(disposition) || defaultName;

        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(blobUrl);
      } catch (err: any) {
        const userMessage =
          err?.userMessage ||
          err?.message ||
          "Não foi possível gerar o relatório.";
        toast({
          variant: "destructive",
          title: "Erro ao exportar relatório",
          description: userMessage,
        });
      }
    },
    [toast],
  );

  const handleExportRange = React.useCallback(
    async (range: string, defaultName: string) => {
      await downloadCsv(
        `/reports/my-reservations/export?range=${encodeURIComponent(range)}`,
        defaultName,
      );
    },
    [downloadCsv],
  );

  const handleExportCarUsage = React.useCallback(async () => {
    await downloadCsv(
      `/reports/my-reservations/by-car/export?range=last-12-months`,
      "my-car-usage-last-12-months.csv",
    );
  }, [downloadCsv]);

  const total = summary?.totalReservations ?? 0;
  const pending = summary?.pendingApproval ?? 0;
  const completed = summary?.completedTrips ?? 0;
  const canceled = summary?.canceledReservations ?? 0;

  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Analyze your own corporate fleet reservations.
          </p>
          {summaryError && (
            <p className="mt-2 text-sm text-red-500">
              {summaryError}
            </p>
          )}
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total Reservations"
            value={loadingSummary ? "…" : formatNumber(total)}
            icon={BarChart3}
          />
          <StatsCard
            title="Pending Approval"
            value={loadingSummary ? "…" : formatNumber(pending)}
            icon={Calendar}
          />
          <StatsCard
            title="Completed Trips"
            value={loadingSummary ? "…" : formatNumber(completed)}
            icon={BarChart3}
          />
          <StatsCard
            title="Canceled Reservations"
            value={loadingSummary ? "…" : formatNumber(canceled)}
            icon={BarChart3}
          />
        </div>

        {/* Blocos de relatórios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reports by User */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Users className="h-5 w-5 text-blue-600" />
                Reports by User
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Download your personal reservation history with preset periods.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                onClick={() =>
                  handleExportRange(
                    "last-30-days",
                    "my-reservations-last-30-days.csv",
                  )
                }
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Last 30 Days Reservations
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                onClick={() =>
                  handleExportRange(
                    "last-quarter",
                    "my-reservations-last-quarter.csv",
                  )
                }
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Last Quarter Reservations
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                onClick={() =>
                  handleExportRange(
                    "last-6-months",
                    "my-reservations-last-6-months.csv",
                  )
                }
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Last 6 Months Reservations
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                onClick={() =>
                  handleExportRange(
                    "last-12-months",
                    "my-reservations-last-12-months.csv",
                  )
                }
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Last 12 Months Reservations
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                onClick={() =>
                  handleExportRange(
                    "canceled-12-months",
                    "my-canceled-reservations-last-12-months.csv",
                  )
                }
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Canceled Reservations (Last 12 Months)
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                onClick={() =>
                  handleExportRange("all", "my-reservations-all.csv")
                }
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                All-time History (CSV)
              </Button>
            </CardContent>
          </Card>

          {/* Reports by Car (uso pessoal) */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Car className="h-5 w-5 text-blue-600" />
                Reports by Car
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                See how you used each car over the last year.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                onClick={handleExportCarUsage}
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Usage by Car (Last 12 Months)
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RoleGuard>
  );
}
