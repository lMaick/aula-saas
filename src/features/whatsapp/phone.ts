export function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits || /^0+$/.test(digits)) return null;

  const normalized = digits.length === 10 || digits.length === 11
    ? `55${digits}`
    : digits;

  return /^[1-9]\d{9,14}$/.test(normalized) ? normalized : null;
}
