import { createHmac, timingSafeEqual } from "node:crypto";

function signatureParts(value: string) {
  return Object.fromEntries(value.split(",").map((part) => {
    const [key, ...rest] = part.trim().split("=");
    return [key, rest.join("=")];
  }));
}

export function validateMercadoPagoWebhookSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
}) {
  if (!input.signature || !input.requestId || !input.dataId || !input.secret) return false;
  const { ts, v1 } = signatureParts(input.signature);
  if (!ts || !v1 || !/^[a-f0-9]{64}$/i.test(v1)) return false;

  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${ts};`;
  const expected = createHmac("sha256", input.secret).update(manifest).digest();
  const received = Buffer.from(v1, "hex");
  return received.length === expected.length && timingSafeEqual(received, expected);
}
