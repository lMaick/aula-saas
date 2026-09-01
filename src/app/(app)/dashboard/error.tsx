"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { reset: () => void }) {
  return <main className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-center"><h1 className="text-xl font-semibold">Não foi possível carregar o dashboard</h1><p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p><Button onClick={reset}>Tentar novamente</Button></main>;
}
