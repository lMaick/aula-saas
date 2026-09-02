export type SubscriptionStatus = "pending" | "active" | "paused" | "cancelled";

export type MercadoPagoSubscriptionStatus =
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "canceled";

export type MercadoPagoSubscription = {
  id: string;
  status: string;
  external_reference: string | null;
  init_point: string | null;
  next_payment_date: string | null;
  auto_recurring: {
    transaction_amount: number;
    currency_id: string;
  };
};
