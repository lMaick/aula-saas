import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Aula SaaS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Fundação técnica pronta para as próximas etapas.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link className={buttonVariants()} href="/entrar">Entrar</Link>
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            href="/cadastrar"
          >
            Criar conta
          </Link>
        </div>
      </div>
    </main>
  );
}
