import * as React from "react";
import { Outlet, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Car, Search, Sun, Moon, Bell, LogOut } from "lucide-react";

import { SidebarNav } from "@/components/sidebar-nav";
import { NotificationsOverlay } from "@/components/notifications-overlay";
import { useTheme } from "@/components/providers/theme-provider";
import { useAuth } from "@/lib/auth";

export default function RequesterLayout() {
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const navigate = useNavigate();

  // pega o usuário e o método de logout do contexto
  const { user, logout } = useAuth();

  const isDark = theme === "dark" || theme === "system";
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("") || "RC";

  // limpa apenas dados FUNCIONAIS do MVP (não mexe no token de auth)
  function clearFunctionalCaches() {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)!;
        if (k.startsWith("reservcar:")) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
  }

  async function handleLogout() {
    try {
      await logout(); // POST /auth/logout + limpa token em memória
      clearFunctionalCaches();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border/50 shadow-lg flex flex-col">
        <div className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-[#1558E9]" />
              <span className="text-xl font-bold text-foreground">
                ReservCar
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
              onClick={() => setShowNotifications(true)}
            >
              <Bell className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 h-10 border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
            />
          </div>
        </div>

        <div className="flex-1 px-4 py-6">
          <SidebarNav
            userRole={user?.role ?? "REQUESTER"}
            baseHref="/requester"
          />
        </div>

        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="h-8 w-8 p-0 focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
            >
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {isDark ? "Dark" : "Light"}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-[#1558E9] text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.name ?? "Guest"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? "—"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout} 
              className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <section className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6 bg-background">
          <Outlet />
        </div>
      </section>

      <NotificationsOverlay
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </div>
  );
}
