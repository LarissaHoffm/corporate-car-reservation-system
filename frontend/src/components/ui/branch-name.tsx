import { useBranches } from "@/hooks/use-branches";

export default function BranchName({ id }: { id?: string | null }) {
  const { branches } = useBranches();
  if (!id) return <span className="text-muted-foreground">-</span>;
  const name = branches.find((b) => b.id === id)?.name;
  return <span>{name ?? id}</span>;
}
