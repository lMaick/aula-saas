export default function DashboardLoading() {
  return <main className="mx-auto max-w-4xl space-y-6 px-4 py-8"><div className="h-8 w-48 animate-pulse rounded bg-muted" /><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div><div className="grid gap-6 lg:grid-cols-2">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-64 animate-pulse rounded-xl bg-muted" />)}</div></main>;
}
