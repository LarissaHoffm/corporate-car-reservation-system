import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Car } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/http/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, user, loading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if ((user as any)?.mustChangePassword) {
      navigate("/change-password", { replace: true });
      return;
    }

    const role = user.role;
    if (role === "ADMIN") navigate("/admin", { replace: true });
    else if (role === "APPROVER") navigate("/approver", { replace: true });
    else if (role === "REQUESTER") navigate("/requester", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      await login(formData.username, formData.password, true);

      try {
        const me = await api.get("/auth/me"); // ajuste a rota se a sua for diferente
        const must =
          (me?.data?.mustChangePassword ??
            me?.data?.user?.mustChangePassword) === true;
        if (must) {
          navigate("/change-password", { replace: true });
          return;
        }
      } catch {
        // se /auth/me não existir, o efeito acima ainda cobre quando o contexto popular o user
      }
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429)
        setErrorMsg("Too many attempts. Please try again in a moment.");
      else if (status === 403) setErrorMsg("Access denied.");
      else setErrorMsg("Invalid credentials. Check your e-mail and password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-card flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Car className="h-8 w-8 text-[#1558E9]" />
          <h1 className="text-2xl font-bold text-[#1558E9]">
            Reservas Corporativas
          </h1>
        </div>

        <Card className="w-full bg-card shadow-lg border-border/50">
          <CardHeader className="text-center pb-2 pt-8">
            <h2 className="text-xl font-bold text-foreground">Sign In</h2>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-muted-foreground mb-2"
                >
                  User
                </label>
                <Input
                  id="username"
                  type="email"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className="w-full h-12 border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-muted-foreground mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="w-full h-12 border-border/50 focus:border-[#1558E9] focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 rounded"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

              <Button
                type="submit"
                disabled={submitting || loading}
                className="w-full h-12 bg-[#1558E9] hover:bg-[#1558E9]/90 text-white font-medium rounded-full focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2"
              >
                {submitting ? "Signing in..." : "Login"}
              </Button>
            </form>

            <div className="text-right mt-4">
              <Link
                to="/forgot-password"
                className="text-sm text-muted-foreground hover:text-[#1558E9] underline focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 rounded"
              >
                Forgot your password?
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Need Help?
                </p>
                <Link
                  to="mailto:larissahoffds@gmail.com?subject=Suporte ReservCar&body=Olá, estou com problemas para acessar minha conta no ReservCar."
                  className="text-sm text-muted-foreground hover:text-[#1558E9] block focus:ring-2 focus:ring-[#1558E9] focus:ring-offset-2 rounded"
                >
                  Contact our Support
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
