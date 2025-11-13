import * as React from "react";
import {
  BarChart3,
  Users,
  Car,
  Building,
  Calendar,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsCard } from "@/components/ui/stats-card";
import { RoleGuard } from "@/components/role-guard";

export default function RequesterReportsPage() {
  return (
    <RoleGuard allowedRoles={["REQUESTER"]} requireAuth={false}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            Manage your corporate fleet reservations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard title="Total Reservations" value="32" icon={BarChart3} />
          <StatsCard title="Active Reservations" value="5" icon={Car} />
          <StatsCard title="Total Time" value="20h" icon={Calendar} />
          <StatsCard title="Fleet Utilization" value="68%" icon={BarChart3} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reports by User */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Users className="h-5 w-5 text-blue-600" />
                Reports by User
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Analyze user metrics and spend by user.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Reservations by User (Last Quarter)
              </Button>
            </CardContent>
          </Card>

          {/* Reports by Car */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Car className="h-5 w-5 text-blue-600" />
                Reports by Car
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage, reservations, and utilization.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Reservations by Car (Last Quarter)
              </Button>
            </CardContent>
          </Card>

          {/* Reports by Branch */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Building className="h-5 w-5 text-blue-600" />
                Reports by Branch
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compare performance by branch.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Reservations by Branch (Monthly)
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-blue-50 hover:border-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2 text-blue-600" />
                Reservations by Branch (Quarterly)
              </Button>
            </CardContent>
          </Card>

          {/* Reports by Period */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground">
                <Calendar className="h-5 w-5 text-blue-600" />
                Reports by Period
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Time-based trends and insights.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-card focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Last 30 Days Reservations
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-border/50 hover:bg-card focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
              >
                <Download className="h-4 w-4 mr-2" />
                Quarterly Trend Report
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <Select>
                <SelectTrigger className="w-[140px] border-border/50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <SelectValue placeholder="Car: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="bmw">BMW X5</SelectItem>
                  <SelectItem value="toyota">Toyota Camry</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-[140px] border-border/50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <SelectValue placeholder="Branch: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="jlle">JLLE</SelectItem>
                  <SelectItem value="cwb">CWB</SelectItem>
                </SelectContent>
              </Select>

              <Select>
                <SelectTrigger className="w-[160px] border-border/50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <SelectValue placeholder="Date Range:" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex gap-2 ml-auto">
                <Button className="bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  Apply Filters
                </Button>
                <Button
                  variant="outline"
                  className="border-border/50 hover:bg-card focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
                <Button
                  variant="outline"
                  className="border-border/50 hover:bg-card focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 bg-transparent"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
