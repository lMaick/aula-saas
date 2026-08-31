import Link from "next/link";

import { AuthShell } from "@/components/shared/auth-shell";
import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/features/auth/actions";

type RecoverPageProps = { searchParams: Promise<{ erro?: string }> };

export default async function RecoverPage({ searchParams }: RecoverPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Recuperar acesso"
      description="Enviaremos um link para redefinir sua senha."
      footer={<Link className="font-medium text-foreground underline" href="/entrar">Voltar para entrar</Link>}
    >
      <FormMessage errorCode={params.erro} />
      <form action={requestPasswordReset} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button className="w-full" type="submit">Enviar link</Button>
      </form>
    </AuthShell>
  );
}
