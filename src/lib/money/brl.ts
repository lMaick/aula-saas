const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatBrlFromCents(cents: number) {
  return brlFormatter.format(cents / 100);
}

export function formatCentsForInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function parseBrlToCents(input: string) {
  const compact = input.replace(/\s/g, "").replace(/^R\$/i, "");
  if (!compact || !/^[0-9.,]+$/.test(compact)) return null;

  let integerPart = compact;
  let fractionPart = "";

  if (compact.includes(",")) {
    if (!/^\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?$|^\d+(?:,\d{1,2})?$/.test(compact)) {
      return null;
    }
    ;[integerPart, fractionPart = ""] = compact.split(",")
  } else if (compact.includes(".")) {
    const decimalMatch = compact.match(/^(\d+)\.(\d{1,2})$/)
    if (decimalMatch) {
      ;[, integerPart, fractionPart] = decimalMatch
    } else if (!/^\d{1,3}(?:\.\d{3})+$/.test(compact)) {
      return null;
    }
  }

  const normalizedInteger = integerPart.replace(/\./g, "");

  if (!/^\d+$/.test(normalizedInteger) || (fractionPart && !/^\d{1,2}$/.test(fractionPart))) {
    return null;
  }

  const reais = Number(normalizedInteger);
  const centavos = fractionPart ? Number(fractionPart.padEnd(2, "0")) : 0;
  const total = reais * 100 + centavos;

  return Number.isSafeInteger(total) ? total : null;
}
