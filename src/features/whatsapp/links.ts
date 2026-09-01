import { normalizeWhatsAppPhone } from "./phone.ts";

export function createWhatsAppUrl(phone: string, message: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  const normalizedMessage = message.trim();
  if (!normalizedPhone || !normalizedMessage) return null;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(normalizedMessage)}`;
}
