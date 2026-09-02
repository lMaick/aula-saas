import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/features/profile/actions";
import { getCurrentProfile } from "@/features/profile/queries";
import { remainingTrialDays } from "@/features/subscriptions/calculations";
import { cancelCurrentSubscription, createSubscriptionCheckout } from "@/features/subscriptions/actions";
import { getSubscriptionPlanConfig } from "@/features/subscriptions/config";
import { getCurrentSubscription } from "@/features/subscriptions/queries";
import { formatBrlFromCents } from "@/lib/money/brl";

type SettingsPageProps = {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [{ profile, email }, params, subscription] = await Promise.all([
    getCurrentProfile(),
    searchParams,
    getCurrentSubscription(),
  ]);
  let configuredPrice: string | null = null;
  try { configuredPrice = formatBrlFromCents(getSubscriptionPlanConfig().amountCents); } catch { /* mensagem segura abaixo */ }

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      <div>
        <p className="text-sm text-muted-foreground">Configurações</p>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil do professor</h1>
      </div>
      <FormMessage errorCode={params.erro} message={params.mensagem} />
      <Card>
        <CardHeader>
          <CardTitle>Informações básicas</CardTitle>
          <CardDescription>Esses dados poderão ser completados agora ou no onboarding.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" value={email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={profile.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject_taught">O que você ensina</Label>
              <Input id="subject_taught" name="subject_taught" defaultValue={profile.subject_taught} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" name="whatsapp" inputMode="tel" defaultValue={profile.whatsapp} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pix_key">Chave Pix (opcional)</Label>
              <Input id="pix_key" name="pix_key" defaultValue={profile.pix_key ?? ""} />
            </div>
            <input type="hidden" name="timezone" value="America/Bahia" />
            <Button type="submit">Salvar perfil</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
          <CardDescription>Seu acesso ao Aula SaaS e o período gratuito.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.status === "active" ? (
            <>
              <div><p className="font-medium">Plano Aula SaaS</p><p className="text-sm text-muted-foreground">Assinatura ativa • {configuredPrice ?? formatBrlFromCents(subscription.amount_cents)} por mês</p></div>
              <form action={cancelCurrentSubscription}><Button type="submit" variant="destructive">Cancelar assinatura</Button></form>
            </>
          ) : (
            <>
              <div><p className="font-medium">Seu período gratuito</p><p className="text-sm text-muted-foreground">{remainingTrialDays(profile.trial_ends_at)} dias restantes</p></div>
              <form action={createSubscriptionCheckout}><Button type="submit">Assinar Aula SaaS</Button></form>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
