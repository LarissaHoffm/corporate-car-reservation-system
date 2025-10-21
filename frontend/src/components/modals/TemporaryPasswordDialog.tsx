import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clipboard, Check } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  email: string;
  password: string;
};

export default function TemporaryPasswordDialog({ open, onOpenChange, email, password }: Props) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const ok = window.confirm("Copiar falhou. Deseja salvar a senha temporária?\n\n" + password);
      if (ok) setCopied(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">Usuário criado</DialogTitle>
          <DialogDescription>
            Copie a <strong>senha temporária</strong>. Ela será exigida apenas no primeiro login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div>
            <label className="text-sm text-muted-foreground">E-mail</label>
            <Input readOnly value={email} className="mt-1" />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-sm text-muted-foreground">Senha temporária</label>
              <Input readOnly value={password} className="mt-1 font-mono" />
            </div>
            <Button onClick={copy} className="self-end">
              {copied ? <Check className="h-4 w-4 mr-1" /> : <Clipboard className="h-4 w-4 mr-1" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => onOpenChange(false)} variant="default">Fechar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
