import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  userName?: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export default function DeleteUserDialog({
  open,
  userName,
  loading,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover usuário</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{" "}
            <strong>{userName ?? "este usuário"}</strong>? Esta ação não pode
            ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={!!loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={!!loading}
          >
            {loading ? "Removendo..." : "Remover"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
