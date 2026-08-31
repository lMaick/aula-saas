import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/features/profile/queries";

type AreaPageProps = { searchParams: Promise<{ mensagem?: string }> };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "America/Bahia",
});

export default async function AreaPage({ searchParams }: AreaPageProps) {
  const [{ profile, email }, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <FormMessage message={params.mensagem} />
      <div>
        <p className="text-sm text-muted-foreground">Área autenticada</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá{profile.name ? `, ${profile.name}` : ""}.
        </h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sua conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <span className="text-muted-foreground">E-mail: </span>{email}
          </div>
          <div>
            <span className="text-muted-foreground">Status: </span>
            Período gratuito
          </div>
          <div>
            <span className="text-muted-foreground">Teste iniciado em: </span>
            {dateFormatter.format(new Date(profile.trial_started_at))}
          </div>
          <div>
            <span className="text-muted-foreground">Teste termina em: </span>
            {dateFormatter.format(new Date(profile.trial_ends_at))}
          </div>
          <p className="text-muted-foreground">
            A expiração é apenas informativa nesta fase e não bloqueia o acesso.
          </p>
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/configuracoes"
          >
            Editar perfil
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
