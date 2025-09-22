import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Car, Search, X } from "lucide-react";
import { cn } from "@/lib/auth/utils";

interface Notification {
  id: string;
  title: string;
  type: "cancelled" | "completed" | "approved" | "available" | "pending";
  isRead: boolean;
}

interface NotificationsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const mockNotifications: Notification[] = [
  { id: "1", title: "Solicitação de Reserva Cancelada", type: "cancelled", isRead: false },
  { id: "2", title: "Solicitação de Reserva Finalizada", type: "completed", isRead: true },
  { id: "3", title: "Checklist Aprovado", type: "approved", isRead: true },
  { id: "4", title: "Seu Carro esta Disponível!", type: "available", isRead: true },
  { id: "5", title: "Solicitação de Reserva Aprovada", type: "approved", isRead: true },
];

const getNotificationColor = (type: string) => {
  switch (type) {
    case "cancelled":
      return "border-l-red-500";
    case "completed":
      return "border-l-blue-500";
    case "approved":
      return "border-l-green-500";
    case "available":
      return "border-l-blue-500";
    case "pending":
      return "border-l-yellow-500";
    default:
      return "border-l-gray-500";
  }
};

export function NotificationsOverlay({ isOpen, onClose }: NotificationsOverlayProps) {
  if (!isOpen) return null;

  const unreadNotifications = mockNotifications.filter((n) => !n.isRead);
  const readNotifications = mockNotifications.filter((n) => n.isRead);

  return (
    <div className="fixed inset-0 z-50 bg-black/20" onClick={onClose}>
      <div className="absolute left-0 top-0 h-full w-80 bg-card shadow-lg border-r border-border/50" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border/50 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-6 w-6 text-[#1558E9]" />
              <span className="text-lg font-bold text-[#1558E9]">ReservCar</span>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." className="h-10 pl-10 focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {unreadNotifications.length > 0 && (
            <div className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Notificações Não Lidas</h3>
              <div className="space-y-2">
                {unreadNotifications.map((n) => (
                  <div key={n.id} className={cn("flex items-center gap-3 rounded-lg border-l-4 bg-background p-3 shadow-sm", getNotificationColor(n.type))}>
                    <div className="flex-shrink-0">
                      <div className="flex h-6 w-6 items-center justify-center rounded border border-border/50 bg-card">
                        <Car className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {readNotifications.length > 0 && (
            <>
              <div className="px-4 py-2">
                <Button variant="ghost" className="w-full text-sm text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2">
                  Limpar Notificações
                </Button>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {readNotifications.map((n) => (
                    <div key={n.id} className={cn("flex items-center gap-3 rounded-lg border-l-4 bg-background p-3 shadow-sm", getNotificationColor(n.type))}>
                      <div className="flex-shrink-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded border border-border/50 bg-card">
                          <Car className="h-3 w-3 text-muted-foreground" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{n.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
