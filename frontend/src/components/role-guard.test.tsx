import { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoleGuard } from "./role-guard";

// Mock de react-router-dom (useLocation + Navigate)
const mockUseLocation = vi.fn();

vi.mock("react-router-dom", () => {
  return {
    useLocation: () => mockUseLocation(),
    Navigate: ({ to, state }: any): ReactElement => (
      <div
        data-testid="navigate"
        data-to={to}
        data-state={state ? JSON.stringify(state) : "null"}
      />
    ),
  };
});

// Mock de useAuth
const mockUseAuth = vi.fn();

vi.mock("@/lib/auth/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

describe("RoleGuard", () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseLocation.mockReset();
    mockUseLocation.mockReturnValue({ pathname: "/requester" });
  });

  it("retorna null enquanto estiver loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });

    const { container } = render(
      <RoleGuard>
        <div>Conteúdo</div>
      </RoleGuard>,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renderiza children quando requireAuth=false mesmo sem usuário", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });

    render(
      <RoleGuard requireAuth={false}>
        <div>Conteúdo Público</div>
      </RoleGuard>,
    );

    expect(screen.getByText("Conteúdo Público")).toBeInTheDocument();
  });

  it("redireciona para /login quando não há usuário e requireAuth=true", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockUseLocation.mockReturnValue({ pathname: "/alguma-rota" });

    render(
      <RoleGuard>
        <div>Conteúdo Protegido</div>
      </RoleGuard>,
    );

    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/login");

    const state = JSON.parse(nav.getAttribute("data-state") || "null");
    expect(state?.from?.pathname).toBe("/alguma-rota");
  });

  it("redireciona para /change-password se mustChangePassword=true", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "REQUESTER", mustChangePassword: true },
      loading: false,
    });
    mockUseLocation.mockReturnValue({ pathname: "/requester" });

    render(
      <RoleGuard>
        <div>Conteúdo Protegido</div>
      </RoleGuard>,
    );

    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/change-password");
  });

  it("renderiza children quando usuário possui role permitida", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "APPROVER", mustChangePassword: false },
      loading: false,
    });

    render(
      <RoleGuard allowedRoles={["APPROVER", "ADMIN"]}>
        <div>Área do Aprovador</div>
      </RoleGuard>,
    );

    expect(screen.getByText("Área do Aprovador")).toBeInTheDocument();
  });

  it("redireciona para /forbidden quando usuário não possui role permitida", () => {
    mockUseAuth.mockReturnValue({
      user: { role: "REQUESTER", mustChangePassword: false },
      loading: false,
    });
    mockUseLocation.mockReturnValue({ pathname: "/admin/area-secreta" });

    render(
      <RoleGuard allowedRoles={["ADMIN"]}>
        <div>Área Admin</div>
      </RoleGuard>,
    );

    const nav = screen.getByTestId("navigate");
    expect(nav.getAttribute("data-to")).toBe("/forbidden");

    const state = JSON.parse(nav.getAttribute("data-state") || "null");
    expect(state?.home).toBe("/requester"); // homeFor('REQUESTER')
  });
});
