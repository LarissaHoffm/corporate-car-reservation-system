import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "@/lib/http/api";

type User = {
  id: string; name: string; email: string; role: string; status: string;
  branch?: { id: string; name: string } | null;
};

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.get<User>(`/users/${id}`)
      .then(res => setUser(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !user) return <div className="p-6 text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="p-6 space-y-3">
      <h1 className="text-xl font-semibold">Detalhes do usuário</h1>
      <div className="rounded border p-4 space-y-1">
        <div><span className="text-muted-foreground">Nome:</span> {user.name}</div>
        <div><span className="text-muted-foreground">E-mail:</span> {user.email}</div>
        <div><span className="text-muted-foreground">Papel:</span> {user.role}</div>
        <div><span className="text-muted-foreground">Status:</span> {user.status}</div>
        {user.branch && <div><span className="text-muted-foreground">Filial:</span> {user.branch.name}</div>}
      </div>
    </div>
  );
}
