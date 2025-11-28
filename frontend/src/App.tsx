import { Routes, Route, Navigate, Link, useLocation } from "react-router-dom";

// Auth
import LoginPage from "@/pages/shared/auth/LoginPage";
import ChangePasswordPage from "@/pages/shared/auth/ChangePasswordPage";

// Requester
import RequesterLayout from "@/pages/requester/layout";
import RequesterDashboard from "@/pages/requester/page";
import RequesterLoading from "@/pages/requester/loading";
import RequesterChecklistPage from "@/pages/requester/checklist";
import RequesterDocumentsPage from "@/pages/requester/documents";
import RequesterGasStationsPage from "@/pages/requester/gasstations";
import RequesterReportsPage from "@/pages/requester/reports";
import RequesterReservationsList from "@/pages/requester/reservations";
import RequesterReservationNew from "@/pages/requester/reservations/new";
import RequesterReservationDetails from "@/pages/requester/reservations/details";
import RequesterReservationUpload from "@/pages/requester/reservations/upload";
import RequesterReservationChecklist from "@/pages/requester/reservations/checklist";

// Approver
import ApproverLayout from "@/pages/approver/layout";
import ApproverDashboard from "@/pages/approver/page";
import ApproverLoading from "@/pages/approver/loading";
import ApproverChecklistsPage from "@/pages/approver/checklist";

// Admin
import AdminLayout from "@/pages/admin/layout";
import AdminDashboard from "@/pages/admin/page";
import AdminChecklistsPage from "@/pages/admin/checklist";
import AdminUsersPage from "@/pages/admin/users";
import AdminUserDetailsPage from "@/pages/admin/users/details";

// Shared
import SharedFleetList from "@/pages/shared/fleet";
import SharedFleetDetails from "@/pages/shared/fleet/details";
import SharedReportsPage from "@/pages/shared/reports";
import SharedDocumentsPage from "@/pages/shared/documents";
import SharedGasStationsPage from "@/pages/shared/gas-stations";
import SharedReservationsPage from "@/pages/shared/reservations";
import SharedMyProfilePage from "@/pages/shared/my-profile/page";

// Providers/UI
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { RoleGuard } from "@/components/role-guard";

function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">404</h1>
        <p className="text-muted-foreground">Página não encontrada</p>
      </div>
    </div>
  );
}

function Forbidden() {
  const location = useLocation();
  const state = (location.state as any) || {};
  const homePath = state.home || "/";

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">403</h1>
        <p className="text-muted-foreground mb-4">
          Você não tem permissão para acessar esta página.
        </p>
        <Link
          to={homePath}
          className="text-sm font-medium text-[#1558E9] hover:underline"
        >
          Voltar para a sua área
        </Link>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />

        {/* Requester (protegida) */}
        <Route
          path="/requester"
          element={
            <RoleGuard allowedRoles={["REQUESTER"]}>
              <RequesterLayout />
            </RoleGuard>
          }
        >
          <Route index element={<RequesterDashboard />} />
          <Route path="loading" element={<RequesterLoading />} />
          <Route path="checklist" element={<RequesterChecklistPage />} />
          <Route path="documents" element={<RequesterDocumentsPage />} />
          <Route path="gas-stations" element={<RequesterGasStationsPage />} />
          <Route path="reports" element={<RequesterReportsPage />} />
          <Route path="my-profile" element={<SharedMyProfilePage />} />
          <Route path="reservations">
            <Route index element={<RequesterReservationsList />} />
            <Route path="new" element={<RequesterReservationNew />} />
            <Route path=":id" element={<RequesterReservationDetails />} />
            <Route path=":id/upload" element={<RequesterReservationUpload />} />
            <Route
              path=":id/checklist"
              element={<RequesterReservationChecklist />}
            />
          </Route>
        </Route>

        {/* Approver (protegida) */}
        <Route
          path="/approver"
          element={
            <RoleGuard allowedRoles={["APPROVER"]}>
              <ApproverLayout />
            </RoleGuard>
          }
        >
          <Route index element={<ApproverDashboard />} />
          <Route path="loading" element={<ApproverLoading />} />
          <Route path="checklist" element={<ApproverChecklistsPage />} />
          <Route path="fleet" element={<SharedFleetList />} />
          <Route path="fleet/:id" element={<SharedFleetDetails />} />
          <Route path="reports" element={<SharedReportsPage />} />
          <Route path="documents" element={<SharedDocumentsPage />} />
          <Route path="gas-stations" element={<SharedGasStationsPage />} />
          <Route path="reservations" element={<SharedReservationsPage />} />
          <Route path="my-profile" element={<SharedMyProfilePage />} />
        </Route>

        {/* Admin (protegida) */}
        <Route
          path="/admin"
          element={
            <RoleGuard allowedRoles={["ADMIN"]}>
              <AdminLayout />
            </RoleGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="checklist" element={<AdminChecklistsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/:id" element={<AdminUserDetailsPage />} />
          <Route path="fleet" element={<SharedFleetList />} />
          <Route path="fleet/:id" element={<SharedFleetDetails />} />
          <Route path="reports" element={<SharedReportsPage />} />
          <Route path="documents" element={<SharedDocumentsPage />} />
          <Route path="gas-stations" element={<SharedGasStationsPage />} />
          <Route path="reservations" element={<SharedReservationsPage />} />
          <Route path="my-profile" element={<SharedMyProfilePage />} />
        </Route>

        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      <Toaster />
    </ThemeProvider>
  );
}
