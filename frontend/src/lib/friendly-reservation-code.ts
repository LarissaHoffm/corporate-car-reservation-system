export type FriendlyReservationCodeInput =
  | string
  | {
      id: string;
      code?: string | null;
    };

/**
 * Gera um código amigável de reserva a partir de:
 * - Uma string (id bruto OU código) OU
 * - Um objeto { id, code }
 *
 * Regra:
 * - Se tiver `code` preenchido, usa o `code`
 * - Senão, usa o `id`
 * - Mantém só letras/números, usa os 8 últimos caracteres e prefixa com "RES-"
 */
export function makeFriendlyReservationCode(
  input: FriendlyReservationCodeInput,
): string {
  if (!input) {
    return "RES-????????";
  }

  if (typeof input === "string") {
    const norm = input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const suffix = norm.slice(-8).padStart(8, "0");
    return `RES-${suffix}`;
  }

  // Objeto { id, code }
  const { id, code } = input;

  const raw =
    typeof code === "string" && code.trim().length > 0 ? code : id;

  if (!raw) return "RES-????????";

  const norm = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = norm.slice(-8).padStart(8, "0");
  return `RES-${suffix}`;
}
