import Link from "next/link";

export function LandingFooter() {
  return <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><div><p className="font-bold tracking-tight">Aula SaaS</p><p className="mt-1 text-sm text-slate-600">Organização simples para professores particulares.</p></div><nav aria-label="Navegação do rodapé" className="flex gap-5 text-sm font-medium"><Link className="rounded-sm hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="/entrar">Entrar</Link><Link className="rounded-sm hover:text-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href="/cadastrar">Criar conta</Link></nav></div></footer>;
}
