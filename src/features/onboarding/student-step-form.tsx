"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveOnboardingStudent } from "@/features/onboarding/actions";
import { formatCentsForInput } from "@/lib/money/brl";
import type { BillingModel } from "@/types/database";

type ExistingStudent = {
  name: string;
  whatsapp: string;
  billing_model: BillingModel;
  billing_amount_cents: number;
};

export function StudentStepForm({ student }: { student?: ExistingStudent | null }) {
  const [billingModel, setBillingModel] = useState<BillingModel>(student?.billing_model ?? "per_lesson");
  const completingPackage = student?.billing_model === "package";

  return (
    <form action={saveOnboardingStudent} className="space-y-5">
      {student ? (
        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <p className="font-medium">{student.name}</p>
          <p className="text-muted-foreground">Vamos completar o pacote deste aluno.</p>
          <input type="hidden" name="name" value={student.name} />
          <input type="hidden" name="whatsapp" value={student.whatsapp} />
          <input type="hidden" name="billing_model" value={student.billing_model} />
          <input type="hidden" name="billing_amount" value={formatCentsForInput(student.billing_amount_cents)} />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="student_name">Nome do aluno</Label>
            <Input id="student_name" name="name" maxLength={120} autoComplete="off" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="student_whatsapp">WhatsApp do aluno</Label>
            <Input id="student_whatsapp" name="whatsapp" inputMode="tel" autoComplete="tel" maxLength={30} placeholder="(73) 99999-9999" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_model">Como você cobra esse aluno?</Label>
            <select
              id="billing_model"
              name="billing_model"
              value={billingModel}
              onChange={(event) => setBillingModel(event.target.value as BillingModel)}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            >
              <option value="per_lesson">Por aula</option>
              <option value="monthly">Mensal</option>
              <option value="package">Pacote de aulas</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billing_amount">{billingModel === "package" ? "Valor total do pacote (R$)" : "Valor (R$)"}</Label>
            <Input id="billing_amount" name="billing_amount" inputMode="decimal" placeholder="70,00" required />
          </div>
        </>
      )}

      {billingModel === "package" || completingPackage ? (
        <div className="space-y-2">
          <Label htmlFor="package_total_lessons">Quantidade de aulas do pacote</Label>
          <Input id="package_total_lessons" name="package_total_lessons" type="number" inputMode="numeric" min={1} defaultValue={10} required />
          <p className="text-xs text-muted-foreground">O pacote e sua cobrança serão criados juntos.</p>
        </div>
      ) : null}

      <Button className="h-10 w-full" type="submit">Continuar</Button>
    </form>
  );
}
