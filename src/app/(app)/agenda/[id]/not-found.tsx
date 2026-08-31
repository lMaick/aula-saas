import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function LessonNotFound() {
  return <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center"><h1 className="text-xl font-semibold">Aula não encontrada</h1><p className="text-sm text-muted-foreground">A aula não existe ou não pertence à sua conta.</p><Link className={buttonVariants()} href="/agenda">Voltar para agenda</Link></main>;
}
