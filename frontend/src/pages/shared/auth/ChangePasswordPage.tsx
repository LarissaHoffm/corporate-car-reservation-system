import * as React from "react";
import { useState, useMemo } from "react";
import { Eye, EyeOff, Lock, Save } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import { AuthAPI } from "@/lib/http/api";

/** regras de senha: 8+, 1 maiúscula, 1 minúscula, 1 dígito, 1 símbolo */
const strongRegex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ChangePasswordPage() {
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [loading, setLoading] = useState(false);

  const isStrong = useMemo(() => strongRegex.test(newPassword), [newPassword]);
  const matches = useMemo(
    () => newPassword.length > 0 && newPassword === confirmPassword,
    [newPassword, confirmPassword]
  );

  const canSubmit = useMemo(() => {
    return !loading && currentPassword.trim().length > 0 && isStrong && matches;
  }, [loading, currentPassword, isStrong, matches]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setLoading(true);

      await AuthAPI.changePassword(currentPassword.trim(), newPassword.trim());

      toast({
        title: "Senha atualizada!",
        description: "Faça login novamente com sua nova senha.",
      });

      try {
        await AuthAPI.logout();
      } catch { /* ignore */ }

      window.location.href = "/login";
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Não foi possível alterar a senha.";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] w-full flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-2xl">
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-500/10">
                <Lock className="h-5 w-5 text-[#1558E9]" />
              </div>
              <CardTitle className="text-xl">Change Password</CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Você precisa definir uma nova senha para continuar.
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Senha atual */}
            <div className="space-y-2">
              <Label>Senha atual</Label>
              <div className="relative">
                <Input
                  type={showCur ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCur((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  aria-label={showCur ? "Esconder senha" : "Mostrar senha"}
                >
                  {showCur ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Nova senha */}
            <div className="space-y-2">
              <Label>Nova senha</Label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  aria-label={showNew ? "Esconder senha" : "Mostrar senha"}
                >
                  {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* checklist – só visual */}
              <ul className="text-sm space-y-1 mt-2">
                <li className={newPassword.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                  • Mínimo de 8 caracteres
                </li>
                <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                  • Pelo menos 1 letra maiúscula (A–Z)
                </li>
                <li className={/[a-z]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                  • Pelo menos 1 letra minúscula (a–z)
                </li>
                <li className={/\d/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                  • Pelo menos 1 dígito (0–9)
                </li>
                <li className={/[^A-Za-z0-9]/.test(newPassword) ? "text-green-600" : "text-muted-foreground"}>
                  • Pelo menos 1 símbolo (ex.: ! @ # $ %)
                </li>
              </ul>
            </div>

            {/* Confirmar nova senha */}
            <div className="space-y-2">
              <Label>Confirmar nova senha</Label>
              <div className="relative">
                <Input
                  type={showConf ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConf((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                  aria-label={showConf ? "Esconder senha" : "Mostrar senha"}
                >
                  {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                disabled={!canSubmit}
                className="w-full bg-[#1558E9] hover:bg-[#1558E9]/90"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar nova senha
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
