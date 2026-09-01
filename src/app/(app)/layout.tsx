import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/actions";
import { getCurrentProfile } from "@/features/profile/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentProfile();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/dashboard" className="font-semibold">Aula SaaS</Link>
          <div className="flex items-center gap-2">
            <Link className="text-sm text-muted-foreground hover:text-foreground" href="/dashboard">
              Início
            </Link>
            <Link className="text-sm text-muted-foreground hover:text-foreground" href="/agenda">
              Agenda
            </Link>
            <Link className="text-sm text-muted-foreground hover:text-foreground" href="/alunos">
              Alunos
            </Link>
            <Link className="text-sm text-muted-foreground hover:text-foreground" href="/financeiro">
              Financeiro
            </Link>
            <Link className="hidden text-sm text-muted-foreground sm:block" href="/configuracoes">
              {profile.name || "Meu perfil"}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="outline" size="sm">Sair</Button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
