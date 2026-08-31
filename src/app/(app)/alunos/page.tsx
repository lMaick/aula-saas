import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { billingModelLabels } from "@/features/students/constants";
import { getStudents } from "@/features/students/queries";
import { formatBrlFromCents } from "@/lib/money/brl";
import { cn } from "@/lib/utils";

type StudentsPageProps = {
  searchParams: Promise<{ busca?: string }>;
};

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const { busca = "" } = await searchParams;
  const students = await getStudents(busca);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Gestão de alunos</p>
          <h1 className="text-2xl font-semibold tracking-tight">Alunos</h1>
        </div>
        <Link className={cn(buttonVariants(), "w-full sm:w-auto")} href="/alunos/novo">
          Novo aluno
        </Link>
      </div>

      <form className="flex gap-2" action="/alunos">
        <Input
          aria-label="Buscar aluno por nome"
          name="busca"
          defaultValue={busca}
          placeholder="Buscar por nome"
        />
        <button className={buttonVariants({ variant: "outline" })} type="submit">
          Buscar
        </button>
      </form>

      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <h2 className="font-medium">
              {busca ? "Nenhum aluno encontrado" : "Você ainda não cadastrou alunos"}
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {busca
                ? "Tente buscar por outro nome."
                : "Cadastre o primeiro aluno para manter suas informações organizadas."}
            </p>
            {!busca ? (
              <Link className={buttonVariants()} href="/alunos/novo">Cadastrar primeiro aluno</Link>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <Link key={student.id} href={`/alunos/${student.id}`} className="block">
              <Card className={cn("transition-colors hover:bg-muted/40", student.status === "inactive" && "opacity-65")}>
                <CardContent className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-medium">{student.name}</h2>
                      <Badge variant={student.status === "active" ? "default" : "secondary"}>
                        {student.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{student.whatsapp}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm">{billingModelLabels[student.billing_model]}</p>
                    <p className="font-medium">{formatBrlFromCents(student.billing_amount_cents)}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
