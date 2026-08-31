import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createStudent, updateStudent } from "@/features/students/actions";
import { billingModelOptions } from "@/features/students/constants";
import { formatCentsForInput } from "@/lib/money/brl";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Student = Database["public"]["Tables"]["students"]["Row"];

type StudentFormProps = {
  student?: Student;
};

export function StudentForm({ student }: StudentFormProps) {
  const editing = Boolean(student);

  return (
    <form action={editing ? updateStudent : createStudent} className="space-y-5">
      {student ? <input type="hidden" name="student_id" value={student.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" defaultValue={student?.name} maxLength={120} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp">WhatsApp</Label>
        <Input
          id="whatsapp"
          name="whatsapp"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={student?.whatsapp}
          maxLength={30}
          placeholder="Ex.: 55 73 99999-9999"
          required
        />
        <p className="text-xs text-muted-foreground">
          Inclua DDD e, se possível, o código do país para uso futuro.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="billing_model">Modelo de cobrança</Label>
          <select
            id="billing_model"
            name="billing_model"
            defaultValue={student?.billing_model ?? "per_lesson"}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            required
          >
            {billingModelOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_amount">Valor (R$)</Label>
          <Input
            id="billing_amount"
            name="billing_amount"
            inputMode="decimal"
            defaultValue={student ? formatCentsForInput(student.billing_amount_cents) : ""}
            placeholder="70,00"
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea id="notes" name="notes" defaultValue={student?.notes ?? ""} maxLength={2000} rows={5} />
      </div>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}
          href={student ? `/alunos/${student.id}` : "/alunos"}
        >
          Cancelar
        </Link>
        <Button className="w-full sm:w-auto" type="submit">
          {editing ? "Salvar alterações" : "Cadastrar aluno"}
        </Button>
      </div>
    </form>
  );
}
