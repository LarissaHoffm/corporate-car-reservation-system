import React from "react";
import CopyableSecret from "@/components/ui/copyable-secret";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  password: string;
};

export default function TemporaryPasswordDialog({
  open,
  onOpenChange,
  email,
  password,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Usuário criado
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground mb-2">
          Senha temporária gerada para <b>{email}</b>. Copie e entregue ao
          usuário.
        </p>

        <CopyableSecret value={password} />

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
