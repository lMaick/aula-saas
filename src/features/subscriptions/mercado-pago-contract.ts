export function buildMercadoPagoSubscriptionPayload(input: {
  ownerId: string;
  email: string;
  amountCents: number;
  returnUrl: string;
}) {
  return {
    reason: "Plano mensal Aula SaaS",
    external_reference: input.ownerId,
    payer_email: input.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: input.amountCents / 100,
      currency_id: "BRL",
    },
    back_url: input.returnUrl,
    status: "pending",
  } as const;
}
