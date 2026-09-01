import { ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { DashboardPreview } from "./product-preview";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200/80">
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.13),transparent_35%),radial-gradient(circle_at_15%_15%,rgba(59,130,246,0.09),transparent_30%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:px-8 lg:py-28">
        <div className="max-w-2xl">
          <p className="mb-5 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">Feito para professores particulares</p>
          <h1 className="text-balance text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-6xl">Suas aulas em ordem. <span className="text-emerald-700">Seu dinheiro também.</span></h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl">Gerencie alunos, aulas, pagamentos e reposições sem depender de planilhas.</p>
          <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link className={buttonVariants({ size: "lg" })} href="/cadastrar">Testar grátis por 14 dias <ArrowRight aria-hidden="true" /></Link>
            <span className="inline-flex items-center gap-2 text-sm text-slate-600"><CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600" /> Sem cartão de crédito.</span>
          </div>
        </div>
        <DashboardPreview />
      </div>
    </section>
  );
}
