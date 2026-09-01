import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLessonPackage } from "@/features/packages/actions";
import { formatCentsForInput } from "@/lib/money/brl";

type PackageFormProps = {
  student: { id: string; name: string; billing_amount_cents: number };
  defaultStartsOn: string;
};

export function PackageForm({ student, defaultStartsOn }: PackageFormProps) {
  return <form action={createLessonPackage} className="space-y-5">
    <input type="hidden" name="student_id" value={student.id} />
    <div className="space-y-2"><Label>Aluno</Label><Input value={student.name} disabled /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2"><Label htmlFor="total_lessons">Quantidade de aulas</Label><Input id="total_lessons" name="total_lessons" type="number" min="1" step="1" defaultValue="10" required /></div>
      <div className="space-y-2"><Label htmlFor="amount">Valor total</Label><Input id="amount" name="amount" inputMode="decimal" defaultValue={formatCentsForInput(student.billing_amount_cents)} required /></div>
      <div className="space-y-2"><Label htmlFor="starts_on">Data de início</Label><Input id="starts_on" name="starts_on" type="date" defaultValue={defaultStartsOn} required /></div>
      <div className="space-y-2"><Label htmlFor="ends_on">Data final (opcional)</Label><Input id="ends_on" name="ends_on" type="date" min={defaultStartsOn} /></div>
    </div>
    <Button className="w-full sm:w-auto" type="submit">Criar pacote e cobrança</Button>
  </form>;
}
