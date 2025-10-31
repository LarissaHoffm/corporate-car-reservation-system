import React from "react";
import CopyableSecret from "@/components/ui/copyable-secret";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
};

export default function TemporaryPasswordDialog({ open, onOpenChange, email, password }: Props) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      // silencioso: copiar pode falhar em http/permissions, sem quebrar UI
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Usuário criado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Senha temporária gerada para <b>{email}</b>. Copie e entregue ao usuário.
          </p>

          {/* Mostra a senha em formato copiável (seu componente padrão) */}
          <CopyableSecret value={password} />

          {/* Também exibe os campos em texto, mantendo o visual atual */}
          <div className="text-sm">
            <div className="text-muted-foreground">Usuário</div>
            <div className="font-medium break-all">{email}</div>
          </div>

          <div className="text-sm">
            <div className="text-muted-foreground">Senha temporária</div>
            <div className="font-mono text-base bg-muted/50 rounded px-2 py-1 select-all">
              {password}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={copy}>Copiar</Button>
            <Button onClick={() => onOpenChange(false)}>Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
