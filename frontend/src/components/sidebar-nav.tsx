import * as React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/auth/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  MapPin,
  FileText,
  CheckSquare,
  BarChart3,
  User,
  // Settings,
  // HelpCircle,
} from "lucide-react";

import type { UserRole } from "@/lib/http/api";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  end?: boolean;
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "APPROVER", "REQUESTER"],
    end: true,
  },
  {
    title: "Reservations",
    href: "/reservations",
    icon: Calendar,
    roles: ["ADMIN", "APPROVER", "REQUESTER"],
  },
  {
    title: "Gas Stations",
    href: "/gas-stations",
    icon: MapPin,
    roles: ["ADMIN", "APPROVER", "REQUESTER"],
  },
  {
    title: "Documents",
    href: "/documents",
    icon: FileText,
    roles: ["ADMIN", "APPROVER", "REQUESTER"],
  },
  {
    title: "Checklist",
    href: "/checklist",
    icon: CheckSquare,
    roles: ["ADMIN", "APPROVER", "REQUESTER"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "APPROVER", "REQUESTER"],
  },
  // ADMIN/APROVER
  { title: "Users", href: "/users", icon: Users, roles: ["ADMIN"] },
  { title: "Fleet", href: "/fleet", icon: Car, roles: ["ADMIN", "APPROVER"] },
];

const supportItems: NavItem[] = [
  {
    title: "My Profile",
    href: "/my-profile",
    icon: User,
    roles: ["ADMIN", "APPROVER", "REQUESTER"],
  },
  // { title: "Help Center",  href: "/help",          icon: HelpCircle,      roles: ["ADMIN","APPROVER","REQUESTER"] },
  // { title: "Settings",     href: "/settings",      icon: Settings,        roles: ["ADMIN","APPROVER","REQUESTER"] },
];

type Props = {
  userRole: UserRole;
  baseHref: string;
};

export function SidebarNav({ userRole, baseHref }: Props) {
  const { pathname: _pathname } = useLocation();

  const getTo = (href: string) => {
    if (href === "/dashboard") return baseHref;
    return `${baseHref}${href}`;
  };

  const visibleMain = navItems.filter((i) => i.roles.includes(userRole));
  const visibleSecond = supportItems.filter((i) => i.roles.includes(userRole));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          MAIN
        </h3>
        <ul className="space-y-1">
          {visibleMain.map((item) => {
            const to = getTo(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <NavLink
                  to={to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#1558E9] text-white shadow-sm"
                        : "text-gray-700 hover:bg-background hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-white" : "text-muted-foreground",
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          SUPPORT
        </h3>
        <ul className="space-y-1">
          {visibleSecond.map((item) => {
            const to = getTo(item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-[#1558E9] text-white shadow-sm"
                        : "text-gray-700 hover:bg-background hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          isActive ? "text-white" : "text-muted-foreground",
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
