import Link from "next/link";

import { AuthShell } from "@/components/shared/auth-shell";
import { FormMessage } from "@/components/shared/form-message";
import { GoogleAuthButton } from "@/components/shared/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/features/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <AuthShell
      title="Entrar"
      description="Acesse sua conta para continuar."
      footer={
        <>
          Ainda não tem conta?{" "}
          <Link className="font-medium text-foreground underline" href="/cadastrar">
            Cadastre-se
          </Link>
        </>
      }
    >
      <FormMessage errorCode={params.erro} message={params.mensagem} />
      <GoogleAuthButton />
      <form action={signIn} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Senha</Label>
            <Link className="text-xs underline" href="/recuperar-acesso">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button className="w-full" type="submit">Entrar</Button>
      </form>
    </AuthShell>
  );
}
