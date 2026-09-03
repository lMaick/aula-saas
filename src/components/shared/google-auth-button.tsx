import { signInWithGoogle } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function GoogleAuthButton() {
  return (
    <>
      <form action={signInWithGoogle}>
        <Button className="w-full" type="submit" variant="outline">
          Continuar com Google
        </Button>
      </form>
      <div className="relative my-5 flex items-center justify-center">
        <span className="absolute inset-x-0 border-t" aria-hidden="true" />
        <span className="relative bg-background px-3 text-xs text-muted-foreground">
          ou
        </span>
      </div>
    </>
  );
}
