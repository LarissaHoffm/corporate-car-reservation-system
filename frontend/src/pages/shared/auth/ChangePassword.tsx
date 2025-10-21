import * as React from "react";
import { useState } from "react";
import { api } from "@/lib/http/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrent] = useState("");
  const [newPassword, setNext] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.patch("/auth/change-password", { currentPassword, newPassword });
      alert("Senha alterada com sucesso! Faça login novamente.");
      window.location.href = "/login";
    } catch (e: any) {
      alert(e?.response?.data?.message || "Erro ao alterar senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-bold mb-4">Definir nova senha</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm">Senha atual (temporária)</label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm">Nova senha</label>
          <Input type="password" value={newPassword} onChange={(e) => setNext(e.target.value)} required />
          <p className="text-xs text-muted-foreground mt-1">Use 8+ caracteres com maiúsculas, minúsculas e números.</p>
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar"}</Button>
      </form>
    </div>
  );
}
