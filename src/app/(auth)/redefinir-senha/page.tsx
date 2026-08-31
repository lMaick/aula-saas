import { AuthShell } from "@/components/shared/auth-shell";
import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword } from "@/features/auth/actions";

type ResetPageProps = { searchParams: Promise<{ erro?: string }> };

export default async function ResetPage({ searchParams }: ResetPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Definir nova senha"
      description="Escolha uma nova senha para sua conta."
      footer="O link de recuperação precisa estar válido."
    >
      <FormMessage errorCode={params.erro} />
      <form action={updatePassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nova senha</Label>
          <Input id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password_confirmation">Confirmar nova senha</Label>
          <Input id="password_confirmation" name="password_confirmation" type="password" minLength={8} autoComplete="new-password" required />
        </div>
        <Button className="w-full" type="submit">Salvar nova senha</Button>
      </form>
    </AuthShell>
  );
}
