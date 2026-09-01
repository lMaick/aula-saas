import type { PackageStatus } from "@/types/database";

export const packageStatusLabels: Record<PackageStatus, string> = {
  active: "Ativo",
  completed: "Concluído",
  cancelled: "Cancelado",
};
