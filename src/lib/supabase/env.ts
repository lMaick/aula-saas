const requiredPublicVariables = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;

export function getSupabasePublicEnv() {
  const values = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  };

  const missing = requiredPublicVariables.filter((name) => !process.env[name]);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis obrigatórias do Supabase ausentes: ${missing.join(", ")}`,
    );
  }

  return {
    url: values.url as string,
    publishableKey: values.publishableKey as string,
    siteUrl: values.siteUrl as string,
  };
}
