"use client";

import { Button } from "@/components/ui/button";

export default function OnboardingError({ reset }: { reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center px-4"><div className="space-y-4 text-center"><h1 className="text-xl font-semibold">Não foi possível carregar o início</h1><p className="text-sm text-muted-foreground">Tente novamente em alguns instantes.</p><Button onClick={reset}>Tentar novamente</Button></div></main>;
}
