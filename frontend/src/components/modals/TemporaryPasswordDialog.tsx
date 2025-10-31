<<<<<<< HEAD
import React from "react";
import CopyableSecret from "@/components/ui/copyable-secret";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
=======
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
};

export default function TemporaryPasswordDialog({ open, onOpenChange, email, password }: Props) {
<<<<<<< HEAD
=======
  const copy = async () => { try { await navigator.clipboard.writeText(password); } catch {} };

>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
<<<<<<< HEAD
          <DialogTitle className="text-lg font-semibold text-foreground">Usuário criado</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-2">
          Senha temporária gerada para <b>{email}</b>. Copie e entregue ao usuário.
        </p>
        <CopyableSecret value={password} />
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white"
          >
            Fechar
          </button>
=======
          <DialogTitle>Senha temporária gerada</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
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
>>>>>>> 946f3ceda114cc349b53aeccb7dd279a09d31415
        </div>
      </DialogContent>
    </Dialog>
  );
}
