import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  password: string;
};

export default function TemporaryPasswordDialog({ open, onOpenChange, email, password }: Props) {
  const copy = async () => { try { await navigator.clipboard.writeText(password); } catch {} };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
