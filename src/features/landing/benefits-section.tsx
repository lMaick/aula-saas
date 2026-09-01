import { CalendarDays, CircleDollarSign, RotateCcw, UsersRound } from "lucide-react";

const benefits = [
  { title: "Alunos", description: "Centralize informações dos seus alunos e a forma de cobrança.", icon: UsersRound },
  { title: "Agenda", description: "Visualize aulas, horários recorrentes, cancelamentos e reagendamentos.", icon: CalendarDays },
  { title: "Financeiro", description: "Saiba quanto recebeu, quanto ainda tem para receber e quem está pendente.", icon: CircleDollarSign },
  { title: "Reposições e pacotes", description: "Controle aulas que precisam ser repostas e quantas ainda restam nos pacotes.", icon: RotateCcw },
];

export function BenefitsSection() {
  return <section className="border-y border-slate-200 bg-slate-950 py-16 text-white sm:py-20" aria-labelledby="benefits-title"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-400">Tudo em um só lugar</p><h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl" id="benefits-title">Menos tempo organizando. Mais tempo ensinando.</h2></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{benefits.map(({ title, description, icon: Icon }) => <article className="rounded-2xl border border-white/10 bg-white/5 p-5" key={title}><div className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300"><Icon aria-hidden="true" className="size-5" /></div><h3 className="mt-5 text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{description}</p></article>)}</div></div></section>;
}
