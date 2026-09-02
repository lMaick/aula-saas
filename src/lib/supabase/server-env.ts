import "server-only";

export function getSupabaseServerEnv() {
  const values = {
    url: process.env.SUPABASE_URL,
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY,
    siteUrl: process.env.SITE_URL,
  };

  const missing = [
    values.url ? null : "SUPABASE_URL",
    values.publishableKey ? null : "SUPABASE_PUBLISHABLE_KEY",
    values.siteUrl ? null : "SITE_URL",
  ].filter((name): name is string => name !== null);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis obrigatórias do Supabase no servidor ausentes: ${missing.join(", ")}`,
    );
  }

  return {
    url: values.url as string,
    publishableKey: values.publishableKey as string,
    siteUrl: values.siteUrl as string,
  };
}
