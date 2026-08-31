type ChargeAmount = {
  amount_cents: number;
  status: "pending" | "paid";
  paid_at: string | null;
};

export function calculateFinancialSummary(
  charges: ChargeAmount[],
  paidRange: { start: Date; end: Date },
) {
  return charges.reduce((summary, charge) => {
    if (charge.status === "pending") summary.pendingCents += charge.amount_cents;
    if (
      charge.status === "paid" && charge.paid_at &&
      new Date(charge.paid_at) >= paidRange.start &&
      new Date(charge.paid_at) < paidRange.end
    ) summary.receivedThisMonthCents += charge.amount_cents;
    return summary;
  }, { pendingCents: 0, receivedThisMonthCents: 0 });
}
