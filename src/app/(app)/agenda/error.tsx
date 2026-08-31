"use client";

import { Button } from "@/components/ui/button";

export default function AgendaError({ reset }: { reset: () => void }) {
  return <main className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-16 text-center"><h1 className="text-xl font-semibold">Não foi possível carregar a agenda</h1><p className="text-sm text-muted-foreground">Tente novamente em instantes.</p><Button onClick={reset}>Tentar novamente</Button></main>;
}
