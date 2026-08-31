export type AccountStatus = "trial" | "active" | "expired";
export type StudentStatus = "active" | "inactive";
export type BillingModel = "per_lesson" | "monthly" | "package";
export type LessonStatus = "scheduled" | "completed" | "cancelled";

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
      students: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          whatsapp: string;
          notes: string | null;
          status: StudentStatus;
          billing_model: BillingModel;
          billing_amount_cents: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          whatsapp: string;
          notes?: string | null;
          status?: StudentStatus;
          billing_model: BillingModel;
          billing_amount_cents: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          whatsapp?: string;
          notes?: string | null;
          status?: StudentStatus;
          billing_model?: BillingModel;
          billing_amount_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          owner_id: string;
          student_id: string;
          starts_at: string;
          ends_at: string;
          status: LessonStatus;
          notes: string | null;
          created_at: string;
          updated_at: string;
          recurrence_id: string | null;
          recurrence_date: string | null;
          recurrence_managed: boolean;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          student_id: string;
          starts_at: string;
          ends_at: string;
          status?: LessonStatus;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          recurrence_id?: string | null;
          recurrence_date?: string | null;
          recurrence_managed?: boolean;
        };
        Update: {
          starts_at?: string;
          ends_at?: string;
          status?: LessonStatus;
          notes?: string | null;
          updated_at?: string;
          recurrence_managed?: boolean;
        };
        Relationships: [];
      };
      lesson_recurrences: {
        Row: {
          id: string;
          owner_id: string;
          student_id: string;
          weekday: number;
          local_start_time: string;
          duration_minutes: number;
          starts_on: string;
          ends_on: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          student_id: string;
          weekday: number;
          local_start_time: string;
          duration_minutes: number;
          starts_on: string;
          ends_on?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          weekday?: number;
          local_start_time?: string;
          duration_minutes?: number;
          starts_on?: string;
          ends_on?: string | null;
          active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      create_weekly_recurrence: {
        Args: {
          p_student_id: string;
          p_weekday: number;
          p_local_start_time: string;
          p_duration_minutes: number;
          p_starts_on: string;
          p_ends_on?: string | null;
        };
        Returns: string;
      };
      update_weekly_recurrence: {
        Args: {
          p_recurrence_id: string;
          p_weekday: number;
          p_local_start_time: string;
          p_duration_minutes: number;
          p_starts_on: string;
          p_ends_on?: string | null;
        };
        Returns: number;
      };
      deactivate_weekly_recurrence: {
        Args: { p_recurrence_id: string };
        Returns: number;
      };
      maintain_weekly_recurrences: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
