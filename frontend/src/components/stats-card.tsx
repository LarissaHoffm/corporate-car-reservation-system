import { Card, CardContent } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/auth/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  color?: string;
  change?: string;
  className?: string;
}

export function StatsCard({ title, value, icon: Icon, color = "text-[#1558E9]", change, className }: StatsCardProps) {
  return (
    <Card className={cn("border-border/50 shadow-sm", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-foreground">{value}</p>
              {change && <span className="text-sm font-medium text-green-600">{change}</span>}
            </div>
          </div>
          <Icon className={`h-8 w-8 ${color}`} />
        </div>
      </CardContent>
    </Card>
  );
}
