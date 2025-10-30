import { api } from "@/lib/http/api";

export interface Branch {
  id: string;
  name: string;
  code?: string;
}

export async function listBranches(): Promise<Branch[]> {
  const { data } = await api.get<Branch[]>("/branches");
  return data;
}

export const BranchesAPI = { list: listBranches };
