import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function StudentNotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Aluno não encontrado</h1>
      <p className="text-sm text-muted-foreground">
        O aluno não existe ou não pertence à sua conta.
      </p>
      <Link className={buttonVariants()} href="/alunos">Voltar para alunos</Link>
    </main>
  );
}
