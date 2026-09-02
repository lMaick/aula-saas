import { getMercadoPagoConfig } from "@/features/subscriptions/config";
import { synchronizeSubscription } from "@/features/subscriptions/service";
import { validateMercadoPagoWebhookSignature } from "@/features/subscriptions/webhook-signature";

type WebhookBody = { type?: unknown; data?: { id?: unknown } };

export async function POST(request: Request) {
  let body: WebhookBody;
  try {
    body = await request.json() as WebhookBody;
  } catch {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (body.type !== "subscription_preapproval") {
    return Response.json({ received: true });
  }

  const url = new URL(request.url);
  const dataId = String(url.searchParams.get("data.id") ?? body.data?.id ?? "");

  try {
    const { webhookSecret } = getMercadoPagoConfig();
    const valid = validateMercadoPagoWebhookSignature({
      signature: request.headers.get("x-signature"),
      requestId: request.headers.get("x-request-id"),
      dataId,
      secret: webhookSecret,
    });
    if (!valid) return Response.json({ error: "invalid_signature" }, { status: 401 });

    await synchronizeSubscription(dataId);
    console.info("Mercado Pago subscription synchronized", { type: body.type, objectId: dataId });
    return Response.json({ received: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unknown";
    console.error("Mercado Pago subscription synchronization failed", { objectId: dataId, code });
    return Response.json({ error: "synchronization_failed" }, { status: 500 });
  }
}
