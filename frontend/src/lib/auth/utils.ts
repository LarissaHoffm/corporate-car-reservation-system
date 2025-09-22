import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const readCookie = (name: string) =>
  document.cookie
    .split("; ")
    .find((r) => r.startsWith(`${name}=`))
    ?.split("=")[1] ?? null;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
