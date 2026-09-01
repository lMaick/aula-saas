import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  return (
    <header className="border-b border-slate-200/80 bg-[#fbfaf7]/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link className="rounded-sm text-lg font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900" href="/">Aula SaaS</Link>
        <nav aria-label="Navegação principal" className="flex items-center gap-2 sm:gap-3">
          <Link className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "px-3")} href="/entrar">Entrar</Link>
          <Link className={buttonVariants({ size: "sm" })} href="/cadastrar">Testar grátis</Link>
        </nav>
      </div>
    </header>
  );
}
