import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export function TrialSection() {
  return <section className="bg-white py-16 sm:py-20" aria-labelledby="trial-title"><div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"><div className="overflow-hidden rounded-3xl bg-emerald-700 px-5 py-10 text-center text-white shadow-xl shadow-emerald-900/10 sm:px-10 sm:py-14"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100">Comece sem compromisso</p><h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl" id="trial-title">Experimente o Aula SaaS por 14 dias</h2><p className="mx-auto mt-4 max-w-2xl text-pretty leading-7 text-emerald-50">Organize sua rotina e conheça o sistema antes de decidir continuar.</p><div className="mt-7 flex flex-col items-center gap-3"><Link className={buttonVariants({ variant: "secondary", size: "lg" })} href="/cadastrar">Começar teste gratuito <ArrowRight aria-hidden="true" /></Link><span className="inline-flex items-center gap-2 text-sm text-emerald-50"><Check aria-hidden="true" className="size-4" /> Sem cartão de crédito.</span></div></div></div></section>;
}
