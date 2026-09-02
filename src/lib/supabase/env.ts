export function getSupabasePublicEnv() {
  const values = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
  };

  const missing = [
    values.url ? null : "NEXT_PUBLIC_SUPABASE_URL",
    values.publishableKey ? null : "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    values.siteUrl ? null : "NEXT_PUBLIC_SITE_URL",
  ].filter((name): name is string => name !== null);

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
