import type { ChargeStatus } from "@/types/database";

export const chargeStatusLabels: Record<ChargeStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
};
