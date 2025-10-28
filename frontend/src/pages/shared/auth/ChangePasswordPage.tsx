// frontend/src/pages/shared/auth/ChangePasswordPage.tsx
import { useState, FormEvent } from "react";
import { AuthAPI } from "@/lib/http/api";
import { useAuth } from "@/lib/auth/useAuth";

export default function ChangePasswordPage() {
  const { user, setUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!user) return null; // segurança extra – RoleGuard/rota também protegem

  const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!strong.test(newPassword)) {
      setErr("Use 8+ caracteres com maiúsculas, minúsculas e números.");
      return;
    }

    try {
      setLoading(true);
      await AuthAPI.changePassword({ currentPassword, newPassword });
      setUser((u) => (u ? { ...u, mustChangePassword: false } : u));
      setCurrentPassword("");
      setNewPassword("");
    } catch (error: any) {
      setErr(error?.response?.data?.message ?? "Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-xl mx-auto">
        <h1 className="text-xl font-bold mb-6">Definir nova senha</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Senha atual (temporária)</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Nova senha</label>
            <input
              type="password"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-gray-500">
              Use 8+ caracteres com maiúsculas, minúsculas e números.
            </p>
          </div>

          {err && <div className="text-sm text-red-600">{err}</div>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg px-4 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Salvando..." : "Salvar"}
          </button>
        </form>
      </div>
    </div>
  );
}
