import Link from "next/link";

import { AuthShell } from "@/components/shared/auth-shell";
import { FormMessage } from "@/components/shared/form-message";
import { GoogleAuthButton } from "@/components/shared/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/features/auth/actions";

type SignupPageProps = { searchParams: Promise<{ erro?: string }> };

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Criar conta"
      description="Comece seu período gratuito de 14 dias."
      footer={
        <>
          Já possui conta?{" "}
          <Link className="font-medium text-foreground underline" href="/entrar">
            Entrar
          </Link>
        </>
      }
    >
      <FormMessage errorCode={params.erro} />
      <GoogleAuthButton />
      <form action={signUp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input id="name" name="name" autoComplete="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
          <p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres.</p>
        </div>
        <Button className="w-full" type="submit">Criar conta</Button>
      </form>
    </AuthShell>
  );
}
