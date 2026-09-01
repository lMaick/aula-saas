import { CalendarDays, CircleDollarSign, Clock3, RotateCcw } from "lucide-react";

const metrics = [
  { label: "Recebido no mês", value: "R$ 1.480,00", icon: CircleDollarSign },
  { label: "A receber", value: "R$ 620,00", icon: Clock3 },
  { label: "Aulas hoje", value: "3", icon: CalendarDays },
  { label: "Reposições pendentes", value: "2", icon: RotateCcw },
];

export function DashboardPreview() {
  return (
    <div aria-label="Demonstração visual do painel Aula SaaS" className="relative mx-auto w-full max-w-2xl">
      <div aria-hidden="true" className="absolute -inset-4 -z-10 rounded-[2rem] bg-emerald-200/30 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5"><div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-rose-300" /><span className="size-2.5 rounded-full bg-amber-300" /><span className="size-2.5 rounded-full bg-emerald-300" /></div><span className="text-xs font-semibold text-slate-500">Visão geral</span></div>
        <div className="p-4 sm:p-6">
          <p className="text-sm text-slate-500">Olá, professora.</p><p className="mt-1 text-xl font-bold tracking-tight text-slate-900">Seu dia está organizado.</p>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
            {metrics.map(({ label, value, icon: Icon }) => <div className="min-w-0 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4" key={label}><Icon aria-hidden="true" className="mb-3 size-4 text-emerald-700" /><p className="truncate text-[11px] text-slate-500 sm:text-xs">{label}</p><p className="mt-1 break-words text-base font-bold tracking-tight text-slate-900 sm:text-lg">{value}</p></div>)}
          </div>
          <div className="mt-5 rounded-xl border border-slate-100 p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Próximas aulas</p><span className="text-xs font-medium text-emerald-700">Hoje</span></div>
            <div className="mt-3 space-y-3 text-sm">
              {[["09:00", "Ana", "Inglês"], ["14:00", "Pedro", "Matemática"], ["18:30", "Lucas", "Violão"]].map(([time, name, subject]) => <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-2" key={time}><span className="font-semibold tabular-nums">{time}</span><span className="min-w-0 truncate text-slate-700">{name}</span><span className="hidden text-xs text-slate-500 min-[390px]:block">{subject}</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
