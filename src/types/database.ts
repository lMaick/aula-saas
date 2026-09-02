export type AccountStatus = "trial" | "active" | "expired";
export type StudentStatus = "active" | "inactive";
export type BillingModel = "per_lesson" | "monthly" | "package";
export type LessonStatus = "scheduled" | "completed" | "cancelled" | "makeup_pending" | "made_up";
export type ChargeStatus = "pending" | "paid";
export type ChargeBillingModel = "per_lesson" | "monthly" | "package";
export type PackageStatus = "active" | "completed" | "cancelled";
export type SubscriptionStatus = "pending" | "active" | "paused" | "cancelled";

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
          is_makeup: boolean;
          makeup_for_lesson_id: string | null;
          reserved_package_id: string | null;
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
          is_makeup?: boolean;
          makeup_for_lesson_id?: string | null;
          reserved_package_id?: string | null;
        };
        Update: {
          starts_at?: string;
          ends_at?: string;
          status?: LessonStatus;
          notes?: string | null;
          updated_at?: string;
          recurrence_managed?: boolean;
          is_makeup?: boolean;
          makeup_for_lesson_id?: string | null;
          reserved_package_id?: string | null;
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
      charges: {
        Row: {
          id: string;
          owner_id: string;
          student_id: string;
          lesson_id: string | null;
          package_id: string | null;
          billing_model: ChargeBillingModel;
          description: string;
          amount_cents: number;
          reference_month: string | null;
          due_date: string;
          status: ChargeStatus;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          student_id: string;
          lesson_id?: string | null;
          package_id?: string | null;
          billing_model: ChargeBillingModel;
          description: string;
          amount_cents: number;
          reference_month?: string | null;
          due_date: string;
          status?: ChargeStatus;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ChargeStatus;
          paid_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      packages: {
        Row: {
          id: string;
          owner_id: string;
          student_id: string;
          total_lessons: number;
          used_lessons: number;
          amount_cents: number;
          status: PackageStatus;
          starts_on: string;
          ends_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          student_id: string;
          total_lessons: number;
          used_lessons?: number;
          amount_cents: number;
          status?: PackageStatus;
          starts_on: string;
          ends_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          used_lessons?: number;
          status?: PackageStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          owner_id: string;
          provider: "mercado_pago";
          provider_subscription_id: string | null;
          provider_status: string | null;
          status: SubscriptionStatus;
          amount_cents: number;
          currency: "BRL";
          checkout_url: string | null;
          activated_at: string | null;
          cancelled_at: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          provider?: "mercado_pago";
          provider_subscription_id?: string | null;
          provider_status?: string | null;
          status?: SubscriptionStatus;
          amount_cents: number;
          currency?: "BRL";
          checkout_url?: string | null;
          activated_at?: string | null;
          cancelled_at?: string | null;
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Record<never, never>;
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
      complete_lesson: {
        Args: { p_lesson_id: string };
        Returns: string | null;
      };
      cancel_lesson: {
        Args: { p_lesson_id: string };
        Returns: boolean;
      };
      cancel_lesson_with_makeup: {
        Args: { p_lesson_id: string };
        Returns: boolean;
      };
      schedule_makeup_lesson: {
        Args: { p_original_lesson_id: string; p_starts_at: string; p_ends_at: string };
        Returns: string;
      };
      create_monthly_charge: {
        Args: { p_student_id: string; p_reference_month: string; p_due_date: string };
        Returns: string;
      };
      mark_charge_paid: {
        Args: { p_charge_id: string };
        Returns: string;
      };
      create_lesson_package: {
        Args: {
          p_student_id: string;
          p_total_lessons: number;
          p_amount_cents: number;
          p_starts_on: string;
          p_ends_on?: string | null;
        };
        Returns: string;
      };
      cancel_lesson_package: {
        Args: { p_package_id: string };
        Returns: boolean;
      };
      create_onboarding_student: {
        Args: {
          p_name: string;
          p_whatsapp: string;
          p_billing_model: BillingModel;
          p_billing_amount_cents: number;
          p_package_total_lessons?: number | null;
        };
        Returns: string;
      };
      complete_onboarding_with_schedule: {
        Args: {
          p_student_id: string;
          p_weekday: number;
          p_local_start_time: string;
          p_duration_minutes: number;
        };
        Returns: string;
      };
      reserve_subscription_checkout: {
        Args: { p_owner_id: string; p_amount_cents: number };
        Returns: string;
      };
      bind_subscription_provider: {
        Args: {
          p_subscription_id: string;
          p_owner_id: string;
          p_provider_subscription_id: string;
          p_provider_status: string;
          p_checkout_url: string;
        };
        Returns: undefined;
      };
      apply_subscription_provider_state: {
        Args: {
          p_owner_id: string;
          p_provider_subscription_id: string;
          p_provider_status: string;
          p_status: SubscriptionStatus;
          p_amount_cents: number;
          p_currency: string;
          p_current_period_end?: string | null;
        };
        Returns: undefined;
      };
      normalize_current_account_access: {
        Args: Record<string, never>;
        Returns: AccountStatus;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
