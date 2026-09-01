import { formatDateKey, formatLessonTime, localDateKey } from "../../lib/dates/timezone.ts";
import { formatBrlFromCents } from "../../lib/money/brl.ts";

export function buildStudentContactMessage(studentName: string) {
  return `Olá, ${studentName}! Tudo bem?`;
}

export function buildLessonReminderMessage(input: {
  studentName: string;
  startsAt: string | Date;
  timeZone: string;
}) {
  const date = formatDateKey(localDateKey(input.startsAt, input.timeZone));
  const time = formatLessonTime(input.startsAt, input.timeZone);
  return `Olá, ${input.studentName}! Passando para lembrar da nossa aula no dia ${date} às ${time}. Até lá!`;
}

export function buildChargeReminderMessage(input: {
  studentName: string;
  description: string;
  amountCents: number;
  dueDate: string;
  pixKey?: string | null;
}) {
  const message = `Olá, ${input.studentName}! Tudo bem? Passando para lembrar do pagamento referente a ${input.description}, no valor de ${formatBrlFromCents(input.amountCents)}, com vencimento em ${formatDateKey(input.dueDate)}.`;
  const pixKey = input.pixKey?.trim();
  return pixKey ? `${message} Chave Pix: ${pixKey}` : message;
}

export function canChargeOnWhatsApp(status: "pending" | "paid") {
  return status === "pending";
}
