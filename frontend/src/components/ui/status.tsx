export function statusChipClasses(s: string) {
  const n = (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const hit = (frag: string) => n.includes(frag);

  const isInactive =
    n === "inactive" ||
    hit("inativo") ||
    hit("indispon") ||
    n === "unavailable";

  const isCancelled =
    hit("cancel") || hit("reprov") || hit("rejeit") || n === "denied";

  const isPending =
    hit("pend") ||
    n === "pending" ||
    n === "aguardando" ||
    n === "em progresso" ||
    n === "solicitado";

  const isActiveBase =
    (hit("active") && !isInactive) ||
    hit("confirm") ||
    hit("aprov") ||
    n === "approved" ||
    n === "available" ||
    n === "ok" ||
    n === "concluida" ||
    hit("valid");

  // frota
  const isReserved = hit("reserv");
  const isMaintenance =
    hit("manuten") || n === "maintenance" || hit("service");

  // qualquer chip que tenha "complet" no texto → azul (COMPLETED)
  const isCompleted = hit("complet");

  if (isInactive) {
    return "bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-400/15 dark:text-zinc-500 dark:border-zinc-500/20";
  }
  if (isCancelled) {
    return "bg-red-100 text-red-800 border border-red-200 dark:bg-red-400/15 dark:text-red-500 dark:border-red-500/20";
  }
  if (isPending) {
    return "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-400/15 dark:text-amber-500 dark:border-amber-500/20";
  }
  if (isMaintenance) {
    return "bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-400/15 dark:text-orange-500 dark:border-orange-500/20";
  }
  if (isReserved) {
    return "bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-400/15 dark:text-blue-500 dark:border-blue-500/20";
  }
  if (isCompleted) {
    // azul clarinho para COMPLETED
    return "bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-400/15 dark:text-sky-500 dark:border-sky-500/20";
  }
  if (isActiveBase) {
    return "bg-green-100 text-green-800 border border-green-200 dark:bg-green-400/15 dark:text-green-500 dark:border-green-500/20";
  }

  // fallback (cinza)
  return "bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-400/15 dark:text-zinc-500 dark:border-zinc-500/20";
}
