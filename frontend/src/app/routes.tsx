import { createBrowserRouter } from "react-router-dom";
import { AuthGuard } from "./guards/AuthGuard";
import { RoleGuard } from "./guards/RoleGuard";

export const router = createBrowserRouter([
  { path: "/login", lazy: () => import("@/pages/shared/LoginPage") },

  {
    path: "/",
    element: <AuthGuard />,
    children: [
      // telas compartilhadas
      { path: "mfa", lazy: () => import("@/pages/shared/MfaPage") },
      { path: "onboarding", lazy: () => import("@/pages/shared/OnboardingPage") },
      { path: "notifications", lazy: () => import("@/pages/shared/NotificationsPage") },
      { path: "reports", lazy: () => import("@/pages/shared/ReportsPage") },
      { path: "me", lazy: () => import("@/pages/shared/MePage") },

      // requester
      {
        path: "requester",
        element: <RoleGuard roles={["REQUESTER"]} />,
        children: [
          { path: "dashboard", lazy: () => import("@/pages/requester/DashboardPage") },
          { path: "reservations", lazy: () => import("@/pages/requester/MyReservationsPage") },
          { path: "reservations/new", lazy: () => import("@/pages/requester/NewReservationPage") },
          { path: "documents/upload", lazy: () => import("@/pages/requester/DocumentsUploadPage") },
          { path: "checklist", lazy: () => import("@/pages/requester/ChecklistPage") },
        ],
      },

      // approver
      {
        path: "approver",
        element: <RoleGuard roles={["APPROVER", "ADMIN"]} />,
        children: [
          { path: "dashboard", lazy: () => import("@/pages/approver/DashboardPage") },
          { path: "reservations", lazy: () => import("@/pages/approver/ReservationsList") },
          { path: "fleet/cars", lazy: () => import("@/pages/approver/CarsList") },
        ],
      },

      // admin
      {
        path: "admin",
        element: <RoleGuard roles={["ADMIN"]} />,
        children: [
          { path: "dashboard", lazy: () => import("@/pages/admin/DashboardPage") },
          { path: "users", lazy: () => import("@/pages/admin/UsersList") },
        ],
      },
    ],
  },
]);
