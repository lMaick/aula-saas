export default function AgendaLoading() {
  return <main className="mx-auto max-w-4xl space-y-4 px-4 py-8" aria-busy="true"><div className="h-8 w-40 animate-pulse rounded bg-muted" /><div className="h-10 w-full animate-pulse rounded bg-muted" />{[1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl border bg-card" />)}<span className="sr-only">Carregando agenda</span></main>;
}
