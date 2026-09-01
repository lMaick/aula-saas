import { redirect } from "next/navigation";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "@/features/auth/actions";
import { lessonDurationOptions, weekdayLabels } from "@/features/lessons/constants";
import { completeOnboardingSchedule, saveOnboardingProfile } from "@/features/onboarding/actions";
import { getOnboardingState } from "@/features/onboarding/queries";
import { StudentStepForm } from "@/features/onboarding/student-step-form";

type OnboardingPageProps = {
  searchParams: Promise<{ erro?: string; mensagem?: string }>;
};

const stepNumber = { profile: 1, student: 2, schedule: 3, finish: 3 } as const;

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [state, params] = await Promise.all([getOnboardingState(), searchParams]);
  if (state.step === "complete") redirect("/dashboard");
  const currentStep = stepNumber[state.step];

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-6 sm:py-10">
      <div className="mx-auto w-full max-w-lg space-y-5">
        <header className="flex items-center justify-between gap-4">
          <span className="font-semibold">Aula SaaS</span>
          <form action={signOut}><Button type="submit" variant="ghost" size="sm">Sair</Button></form>
        </header>

        <div className="space-y-2" aria-label={`Passo ${currentStep} de 3`}>
          <div className="flex items-center justify-between text-sm"><span>Passo {currentStep} de 3</span><span className="text-muted-foreground">Vamos organizar sua primeira aula</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(currentStep / 3) * 100}%` }} /></div>
        </div>

        <FormMessage errorCode={params.erro} message={params.mensagem} />

        {state.step === "profile" ? (
          <Card>
            <CardHeader><CardTitle>Primeiro, conte um pouco sobre você</CardTitle><CardDescription>Somente o necessário para personalizar seu espaço.</CardDescription></CardHeader>
            <CardContent>
              <form action={saveOnboardingProfile} className="space-y-5">
                <div className="space-y-2"><Label htmlFor="name">Seu nome</Label><Input id="name" name="name" defaultValue={state.profile.name} autoComplete="name" required /></div>
                <div className="space-y-2"><Label htmlFor="subject_taught">O que você ensina?</Label><Input id="subject_taught" name="subject_taught" defaultValue={state.profile.subject_taught} placeholder="Ex.: Inglês, matemática, violão" required /></div>
                <div className="space-y-2"><Label htmlFor="whatsapp">Seu WhatsApp (opcional)</Label><Input id="whatsapp" name="whatsapp" inputMode="tel" autoComplete="tel" defaultValue={state.profile.whatsapp} /></div>
                <div className="space-y-2"><Label htmlFor="pix_key">Chave Pix (opcional)</Label><Input id="pix_key" name="pix_key" defaultValue={state.profile.pix_key ?? ""} /></div>
                <Button className="h-10 w-full" type="submit">Continuar</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {state.step === "student" ? (
          <Card>
            <CardHeader><CardTitle>Vamos cadastrar seu primeiro aluno</CardTitle><CardDescription>Defina como esse aluno é cobrado. Você poderá editar tudo depois.</CardDescription></CardHeader>
            <CardContent><StudentStepForm student={state.student} /></CardContent>
          </Card>
        ) : null}

        {state.step === "schedule" && state.student ? (
          <Card>
            <CardHeader><CardTitle>Quando você costuma dar aula para {state.student.name}?</CardTitle><CardDescription>Vamos criar um horário semanal e preencher as próximas 8 semanas.</CardDescription></CardHeader>
            <CardContent>
              <form action={completeOnboardingSchedule} className="space-y-5">
                <input type="hidden" name="student_id" value={state.student.id} />
                <div className="space-y-2"><Label htmlFor="weekday">Dia da semana</Label><select id="weekday" name="weekday" defaultValue="2" className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm" required>{Object.entries(weekdayLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="local_start_time">Horário</Label><Input id="local_start_time" name="local_start_time" type="time" defaultValue="14:00" required /></div>
                  <div className="space-y-2"><Label htmlFor="duration_minutes">Duração</Label><select id="duration_minutes" name="duration_minutes" defaultValue="60" className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm" required>{lessonDurationOptions.map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></div>
                </div>
                <Button className="h-10 w-full" type="submit">Criar horário e abrir meu painel</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}

        {state.step === "finish" && state.student && state.recurrence ? (
          <Card>
            <CardHeader><CardTitle>Tudo certo. Seu painel já está pronto.</CardTitle><CardDescription>Encontramos seu aluno e o horário semanal já configurado.</CardDescription></CardHeader>
            <CardContent>
              <form action={completeOnboardingSchedule}>
                <input type="hidden" name="student_id" value={state.student.id} />
                <input type="hidden" name="weekday" value={state.recurrence.weekday} />
                <input type="hidden" name="local_start_time" value={state.recurrence.local_start_time.slice(0, 5)} />
                <input type="hidden" name="duration_minutes" value={state.recurrence.duration_minutes} />
                <Button className="h-10 w-full" type="submit">Abrir meu painel</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </main>
  );
}
