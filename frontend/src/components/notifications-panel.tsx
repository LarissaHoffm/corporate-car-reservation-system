import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, FileCheck, Car } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "reservation" | "document" | "checklist" | "system";
  status: "unread" | "read";
  timestamp: string;
}

const mockNotifications: Notification[] = [
  { id: "1", title: "Solicitação de Reserva Cancelada", message: "Sua reserva #R2023001 foi cancelada", type: "reservation", status: "unread", timestamp: "2 min ago" },
  { id: "2", title: "Solicitação de Reserva Finalizada", message: "Reserva #R2023002 foi finalizada com sucesso", type: "reservation", status: "unread", timestamp: "5 min ago" },
  { id: "3", title: "Checklist Aprovado", message: "Checklist de retorno foi aprovado", type: "checklist", status: "unread", timestamp: "10 min ago" },
  { id: "4", title: "Seu Carro está Disponível!", message: "Veículo Toyota Camry está pronto para retirada", type: "system", status: "unread", timestamp: "15 min ago" },
  { id: "5", title: "Solicitação de Reserva Aprovada", message: "Sua reserva #R2023003 foi aprovada", type: "reservation", status: "read", timestamp: "1 hour ago" },
];

export function NotificationsPanel() {
  const unreadNotifications = mockNotifications.filter((n) => n.status === "unread");

  const getIcon = (type: string) => {
    switch (type) {
      case "reservation":
        return <Car className="h-4 w-4 text-[#1558E9]" />;
      case "document":
        return <FileCheck className="h-4 w-4 text-green-600" />;
      case "checklist":
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-orange-600" />;
    }
  };

  return (
    <div className="h-full w-80 overflow-y-auto border-l border-border bg-background">
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Notificações</h2>
          <Button variant="ghost" size="sm" className="text-[#1558E9] hover:text-[#1558E9]/80">
            Limpar Notificações
          </Button>
        </div>
      </div>

      <div className="p-4">
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">Notificações Não Lidas</h3>
        <div className="space-y-3">
          {unreadNotifications.map((n) => (
            <div key={n.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 hover:bg-accent/50">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent">{getIcon(n.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{n.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">{n.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
