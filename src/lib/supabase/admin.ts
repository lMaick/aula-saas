import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServerEnv } from "@/lib/supabase/server-env";
import type { Database } from "@/types/database";

export function createSubscriptionAdminClient() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("subscription_admin_unavailable");

  return createClient<Database>(getSupabaseServerEnv().url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
