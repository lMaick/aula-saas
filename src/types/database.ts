export type AccountStatus = "trial" | "active" | "expired";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          subject_taught: string;
          whatsapp: string;
          pix_key: string | null;
          timezone: string;
          onboarding_completed_at: string | null;
          trial_started_at: string;
          trial_ends_at: string;
          account_status: AccountStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          subject_taught?: string;
          whatsapp?: string;
          pix_key?: string | null;
          timezone?: string;
          onboarding_completed_at?: string | null;
          trial_started_at?: string;
          trial_ends_at?: string;
          account_status?: AccountStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          subject_taught?: string;
          whatsapp?: string;
          pix_key?: string | null;
          timezone?: string;
          onboarding_completed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
