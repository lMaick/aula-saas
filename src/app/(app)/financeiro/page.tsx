import { FormMessage } from "@/components/shared/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMonthlyCharge, markChargePaid } from "@/features/finance/actions";
import { chargeStatusLabels } from "@/features/finance/constants";
import { getFinanceOverview, getMonthlyStudents } from "@/features/finance/queries";
import { formatDateKey } from "@/lib/dates/timezone";
import { formatBrlFromCents } from "@/lib/money/brl";
import { cn } from "@/lib/utils";

type FinancePageProps = {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
};

type ChargeItem = Awaited<ReturnType<typeof getFinanceOverview>>["pending"][number];

function ChargeList({ charges, today }: { charges: ChargeItem[]; today: string }) {
  if (!charges.length) return <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma cobrança nesta seção.</p>;
  return <div className="divide-y">{charges.map((charge) => {
    const overdue = charge.status === "pending" && charge.due_date < today;
    return <div key={charge.id} className="space-y-3 py-4 first:pt-0 last:pb-0 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{charge.studentName}</p><Badge variant={overdue ? "destructive" : charge.status === "paid" ? "secondary" : "outline"}>{overdue ? "Atrasada" : chargeStatusLabels[charge.status]}</Badge></div>
        <p className="text-sm text-muted-foreground">{charge.description}</p>
        <p className={cn("mt-1 text-sm", overdue && "text-destructive")}>Vencimento: {formatDateKey(charge.due_date)}</p>
      </div>
      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
        <p className="font-semibold">{formatBrlFromCents(charge.amount_cents)}</p>
        {charge.status === "pending" ? <form action={markChargePaid}><input type="hidden" name="charge_id" value={charge.id} /><Button size="sm" type="submit">Marcar como pago</Button></form> : null}
      </div>
    </div>;
  })}</div>;
}

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const [query, overview, monthlyStudents] = await Promise.all([
    searchParams,
    getFinanceOverview(),
    getMonthlyStudents(),
  ]);

  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
    <FormMessage errorCode={query.erro} message={query.mensagem} />
    <div><p className="text-sm text-muted-foreground">Controle operacional</p><h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1></div>

    <section className="grid gap-4 sm:grid-cols-2">
      <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">A receber</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatBrlFromCents(overview.summary.pendingCents)}</p></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Recebido no mês</CardTitle></CardHeader><CardContent><p className="text-2xl font-semibold">{formatBrlFromCents(overview.summary.receivedThisMonthCents)}</p></CardContent></Card>
    </section>

    <Card>
      <CardHeader><CardTitle>Gerar mensalidade</CardTitle></CardHeader>
      <CardContent>
        {!monthlyStudents.length ? <p className="text-sm text-muted-foreground">Nenhum aluno mensalista ativo disponível.</p> : <form action={createMonthlyCharge} className="grid gap-4 sm:grid-cols-3 sm:items-end">
          <div className="space-y-2"><Label htmlFor="student_id">Aluno</Label><select id="student_id" name="student_id" className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm" required>{monthlyStudents.map((student) => <option key={student.id} value={student.id}>{student.name} — {formatBrlFromCents(student.billing_amount_cents)}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="reference_month">Competência</Label><Input id="reference_month" name="reference_month" type="month" defaultValue={overview.currentMonth} required /></div>
          <div className="space-y-2"><Label htmlFor="due_date">Vencimento</Label><Input id="due_date" name="due_date" type="date" defaultValue={`${overview.currentMonth}-10`} required /></div>
          <Button className="sm:col-span-3 sm:w-fit" type="submit">Criar mensalidade</Button>
        </form>}
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle>Pendentes</CardTitle></CardHeader><CardContent><ChargeList charges={overview.pending} today={overview.today} /></CardContent></Card>
    <Card><CardHeader><CardTitle>Pagas</CardTitle></CardHeader><CardContent><ChargeList charges={overview.paid} today={overview.today} /></CardContent></Card>
  </main>;
}
