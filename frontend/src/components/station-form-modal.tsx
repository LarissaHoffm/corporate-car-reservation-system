import * as React from "react";
import { Station, StationInput } from "@/lib/http/stations";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: StationInput) => Promise<void> | void;
  initialData?: Partial<Station> | null;
  defaultBranchId?: string | null;
  loading?: boolean;
};

type Errors = Partial<Record<keyof StationInput | "state", string>>;

export default function StationFormModal({
  open,
  onClose,
  onSubmit,
  initialData,
  defaultBranchId,
  loading = false,
}: Props) {
  const isEdit = Boolean(initialData?.id);

  const [name, setName] = React.useState("");
  const [city, setCity] = React.useState("");
  const [stateUF, setStateUF] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [latitude, setLatitude] = React.useState<string>("");
  const [longitude, setLongitude] = React.useState<string>("");
  const [isActive, setIsActive] = React.useState(true);
  const [errors, setErrors] = React.useState<Errors>({});

  // Preencher ao abrir/editar
  React.useEffect(() => {
    if (!open) return;
    setErrors({});
    setName(initialData?.name ?? "");
    setCity(initialData?.city ?? "");
    setStateUF(initialData?.state ?? "");
    setAddress(initialData?.address ?? "");
    setLatitude(
      initialData?.latitude === null || initialData?.latitude === undefined
        ? ""
        : String(initialData?.latitude)
    );
    setLongitude(
      initialData?.longitude === null || initialData?.longitude === undefined
        ? ""
        : String(initialData?.longitude)
    );
    setIsActive(initialData?.isActive ?? true);
  }, [open, initialData]);

  const toNumberOrNull = (v: string): number | null => {
    const txt = v.trim().replace(",", ".");
    if (txt === "") return null;
    const n = Number(txt);
    return Number.isFinite(n) ? n : (NaN as any);
  };

  const validate = (): boolean => {
    const next: Errors = {};

    if (!name.trim()) next.name = "Informe o nome do posto.";
    if (!city.trim()) next.city = "Informe a cidade.";
    if (!stateUF.trim()) next.state = "Informe a UF (ex.: SC).";
    if (stateUF && stateUF.trim().length > 2)
      next.state = "UF deve ter 2 caracteres.";

    const lat = toNumberOrNull(latitude);
    const lon = toNumberOrNull(longitude);

    if (latitude && Number.isNaN(lat)) next.latitude = "Latitude inválida.";
    if (longitude && Number.isNaN(lon)) next.longitude = "Longitude inválida.";

    if (lat !== null && (lat < -90 || lat > 90))
      next.latitude = "Latitude deve estar entre -90 e 90.";
    if (lon !== null && (lon < -180 || lon > 180))
      next.longitude = "Longitude deve estar entre -180 e 180.";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload: StationInput = {
      branchId: initialData?.branchId ?? defaultBranchId ?? undefined,
      name: name.trim(),
      city: city.trim(),
      state: stateUF.trim().toUpperCase(),
      address: address.trim() || undefined,
      latitude:
        latitude.trim() === "" ? null : Number(latitude.trim().replace(",", ".")),
      longitude:
        longitude.trim() === "" ? null : Number(longitude.trim().replace(",", ".")),
      isActive,
    };

    await onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? onClose() : null)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar posto" : "Novo posto"}</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo. Latitude/Longitude são opcionais.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="station-name">Nome</Label>
            <Input
              id="station-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Posto Centro"
              disabled={loading}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="station-city">Cidade</Label>
              <Input
                id="station-city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex.: Joinville"
                disabled={loading}
              />
              {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="station-uf">UF</Label>
              <Input
                id="station-uf"
                value={stateUF}
                onChange={(e) => setStateUF(e.target.value)}
                placeholder="SC"
                maxLength={2}
                disabled={loading}
              />
              {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="station-address">Endereço (opcional)</Label>
            <Input
              id="station-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua Exemplo, 123 - Centro"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="station-lat">Latitude (opcional)</Label>
              <Input
                id="station-lat"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-26.3041"
                disabled={loading}
              />
              {errors.latitude && (
                <p className="text-sm text-red-500">{errors.latitude}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="station-lon">Longitude (opcional)</Label>
              <Input
                id="station-lon"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-48.8464"
                disabled={loading}
              />
              {errors.longitude && (
                <p className="text-sm text-red-500">{errors.longitude}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label className="font-medium">Ativo</Label>
              <p className="text-xs text-muted-foreground">
                Postos inativos não aparecem para reservas futuras.
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} disabled={loading} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {isEdit ? "Salvar alterações" : "Criar posto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
