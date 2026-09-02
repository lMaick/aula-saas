import Link from "next/link";

import { FormMessage } from "@/components/shared/form-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { synchronizeCurrentSubscription } from "@/features/subscriptions/actions";
import { getCurrentSubscription } from "@/features/subscriptions/queries";

type ReturnPageProps = { searchParams: Promise<{ erro?: string; mensagem?: string }> };

export default async function SubscriptionReturnPage({ searchParams }: ReturnPageProps) {
  const [params, subscription] = await Promise.all([searchParams, getCurrentSubscription()]);
  const active = subscription?.status === "active";
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{active ? "Assinatura confirmada" : "Estamos confirmando sua assinatura"}</CardTitle>
          <CardDescription>{active ? "Seu acesso ao Aula SaaS está ativo." : "O Mercado Pago pode levar alguns instantes para confirmar. O retorno do checkout, sozinho, não libera o acesso."}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormMessage errorCode={params.erro} message={params.mensagem} />
          {active ? <Link className={buttonVariants({ className: "w-full" })} href="/dashboard">Ir para o dashboard</Link> : <form action={synchronizeCurrentSubscription}><Button className="w-full" type="submit">Verificar novamente</Button></form>}
          {!active ? <Link className={buttonVariants({ variant: "outline", className: "w-full" })} href="/assinar">Voltar</Link> : null}
        </CardContent>
      </Card>
    </main>
  );
}
