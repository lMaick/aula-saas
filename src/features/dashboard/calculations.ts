import { availablePackageLessons } from "../lessons/makeup-calculations.ts";

type PendingCharge = { amount_cents: number; due_date: string };

export function calculateDashboardFinancials(
  paidCharges: Array<{ amount_cents: number }>,
  pendingCharges: PendingCharge[],
  today: string,
) {
  return {
    receivedThisMonthCents: paidCharges.reduce((total, charge) => total + charge.amount_cents, 0),
    pendingCents: pendingCharges.reduce((total, charge) => total + charge.amount_cents, 0),
    overdueCents: pendingCharges.reduce(
      (total, charge) => total + (charge.due_date < today ? charge.amount_cents : 0),
      0,
    ),
  };
}

export function dashboardPackageAvailability(
  totalLessons: number,
  usedLessons: number,
  reservedLessons: number,
) {
  return availablePackageLessons(totalLessons, usedLessons, reservedLessons);
}

export function shouldShowPackageNearEnd(
  packageStatus: "active" | "completed" | "cancelled",
  studentStatus: "active" | "inactive",
  availableLessons: number,
) {
  return packageStatus === "active" && studentStatus === "active" &&
    availableLessons >= 1 && availableLessons <= 2;
}

export function countDashboardAttention(
  overdueCharges: number,
  pendingMakeups: number,
  packagesNearEnd: number,
) {
  return overdueCharges + pendingMakeups + packagesNearEnd;
}

export function daysOverdue(dueDate: string, today: string) {
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round((current - due) / 86_400_000));
}
