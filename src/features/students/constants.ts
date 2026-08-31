import type { BillingModel } from "@/types/database";

export const billingModelLabels: Record<BillingModel, string> = {
  per_lesson: "Por aula",
  monthly: "Mensalidade",
  package: "Pacote",
};

export const billingModelOptions = Object.entries(billingModelLabels) as Array<
  [BillingModel, string]
>;
