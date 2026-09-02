import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/features/auth/actions";
import { createSubscriptionCheckout } from "@/features/subscriptions/actions";
import { getSubscriptionPlanConfig } from "@/features/subscriptions/config";
import { getCurrentSubscription } from "@/features/subscriptions/queries";
import { formatBrlFromCents } from "@/lib/money/brl";

type SubscribePageProps = { searchParams: Promise<{ erro?: string; mensagem?: string }> };

export default async function SubscribePage({ searchParams }: SubscribePageProps) {
  const [params, subscription] = await Promise.all([searchParams, getCurrentSubscription()]);
  let price: string | null = null;
  try { price = formatBrlFromCents(getSubscriptionPlanConfig().amountCents); } catch { /* configuração ausente é exibida ao enviar */ }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <p className="text-sm font-medium text-primary">Aula SaaS</p>
          <CardTitle className="text-2xl">Seu período gratuito terminou</CardTitle>
          <CardDescription>Continue usando seus alunos, agenda e financeiro assinando o Aula SaaS.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <FormMessage errorCode={params.erro} message={params.mensagem} />
          <div className="rounded-lg bg-muted p-4">
            <p className="font-medium">Plano mensal Aula SaaS</p>
            <p className="mt-1 text-2xl font-semibold">{price ?? "Preço indisponível"}</p>
            <p className="text-sm text-muted-foreground">Cobrança mensal pelo Mercado Pago.</p>
          </div>
          <form action={createSubscriptionCheckout}>
            <Button className="w-full" type="submit">
              {subscription?.status === "pending" ? "Continuar assinatura" : "Continuar com o Aula SaaS"}
            </Button>
          </form>
          <form action={signOut}><Button className="w-full" type="submit" variant="outline">Sair</Button></form>
        </CardContent>
      </Card>
    </main>
  );
}
