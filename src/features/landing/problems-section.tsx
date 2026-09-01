import { CircleAlert } from "lucide-react";

const problems = ["Esquecer quem já pagou e quem ainda está pendente.", "Procurar o horário de cada aluno nas conversas do WhatsApp.", "Perder o controle das aulas que precisam de reposição.", "Não saber quantas aulas ainda restam em um pacote.", "Atualizar planilhas manualmente depois de cada aula."];

export function ProblemsSection() {
  return <section className="bg-white py-16 sm:py-20" aria-labelledby="problems-title"><div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8"><div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Sua rotina pode ser mais simples</p><h2 className="mt-3 text-balance text-3xl font-bold tracking-tight sm:text-4xl" id="problems-title">Ainda controla suas aulas no WhatsApp, planilha e memória?</h2></div><ul className="mx-auto mt-10 grid max-w-4xl gap-3 sm:grid-cols-2">{problems.map((problem) => <li className="flex gap-3 rounded-xl border border-slate-200 bg-[#fbfaf7] p-4 text-sm leading-6 text-slate-700 last:sm:col-span-2" key={problem}><CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-600" />{problem}</li>)}</ul></div></section>;
}
