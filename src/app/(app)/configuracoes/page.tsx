import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/features/profile/actions";
import { getCurrentProfile } from "@/features/profile/queries";

type SettingsPageProps = {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const [{ profile, email }, params] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);

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
    </main>
  );
}
