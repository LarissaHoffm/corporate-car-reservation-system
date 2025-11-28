import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "./LoginPage";

const mockLogin = vi.fn();
let mockUser: any = null;
let mockLoading = false;
const mockApiGet = vi.fn();
const mockNavigate = vi.fn();

// mocks (Vitest hoista isso antes dos imports reais)
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({
    login: mockLogin,
    user: mockUser,
    loading: mockLoading,
  }),
}));

vi.mock("@/lib/http/api", () => ({
  api: {
    get: (...args: any[]) => mockApiGet(...args),
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom",
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUser = null;
  mockLoading = false;
  mockLogin.mockReset();
  mockApiGet.mockReset();
  mockNavigate.mockReset();
});

describe("LoginPage", () => {
  it("renderiza campos de usuário, senha e botão de login", () => {
    renderLogin();

    expect(screen.getByLabelText(/user/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /login/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/forgot your password\?/i),
    ).toBeInTheDocument();
  });

  it("permite alternar visibilidade da senha", () => {
    const { container } = renderLogin();

    const passwordInput = screen.getByLabelText(
      /password/i,
    ) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    // botão de toggle é o único com type="button"
    const toggleButton = container.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement;

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("text");

    fireEvent.click(toggleButton);
    expect(passwordInput.type).toBe("password");
  });

  it("envia formulário e chama login com username, password e remember=true", async () => {
    mockLogin.mockResolvedValue({});
    mockApiGet.mockResolvedValue({ data: { mustChangePassword: false } });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/user/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Secret123!" },
    });

    const submitButton = screen.getByRole("button", {
      name: /login/i,
    }) as HTMLButtonElement;

    expect(submitButton).not.toBeDisabled();

    fireEvent.click(submitButton);

    // durante o submit, botão fica desabilitado
    expect(submitButton).toBeDisabled();

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(
        "user@test.com",
        "Secret123!",
        true,
      );
    });

    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/auth/me");
  });

  it("mostra mensagem específica para erro 403 (Access denied)", async () => {
    mockLogin.mockRejectedValue({ response: { status: 403 } });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/user/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Wrong123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(await screen.findByText(/access denied\./i)).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("mostra mensagem específica para erro 429 (Too many attempts)", async () => {
    mockLogin.mockRejectedValue({ response: { status: 429 } });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/user/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Wrong123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(
      await screen.findByText(/too many attempts\. please try again/i),
    ).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("mostra mensagem genérica para outros erros de login", async () => {
    mockLogin.mockRejectedValue({ response: { status: 500 } });

    renderLogin();

    fireEvent.change(screen.getByLabelText(/user/i), {
      target: { value: "user@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Wrong123!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /login/i }));

    expect(
      await screen.findByText(/invalid credentials\. check your e-mail/i),
    ).toBeInTheDocument();
    expect(mockApiGet).not.toHaveBeenCalled();
  });

  it("redireciona para troca de senha quando mustChangePassword = true", async () => {
    mockUser = {
      id: "u1",
      role: "REQUESTER",
      mustChangePassword: true,
    };

    renderLogin();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/change-password", {
        replace: true,
      });
    });
  });

  it("redireciona para dashboard correto conforme role", async () => {
    mockUser = {
      id: "admin1",
      role: "ADMIN",
      mustChangePassword: false,
    };

    renderLogin();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true });
    });

    mockNavigate.mockClear();
    mockUser = {
      id: "approver1",
      role: "APPROVER",
      mustChangePassword: false,
    };

    renderLogin();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/approver", {
        replace: true,
      });
    });

    mockNavigate.mockClear();
    mockUser = {
      id: "requester1",
      role: "REQUESTER",
      mustChangePassword: false,
    };

    renderLogin();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/requester", {
        replace: true,
      });
    });
  });
});
