type OnboardingStudent = {
  status: "active" | "inactive";
  created_at: string;
};

export type OnboardingStep = "profile" | "student" | "schedule" | "finish" | "complete";

export function isOnboardingProfileReady(profile: { name: string; subject_taught: string }) {
  return profile.name.trim().length >= 2 && profile.subject_taught.trim().length > 0;
}

export function selectFirstOnboardingStudent<T extends OnboardingStudent>(students: T[]) {
  return students
    .filter((student) => student.status === "active")
    .sort((first, second) => first.created_at.localeCompare(second.created_at))[0] ?? null;
}

export function identifyOnboardingStep(input: {
  completedAt: string | null;
  profileReady: boolean;
  hasStudent: boolean;
  packageReady: boolean;
  hasRecurrence: boolean;
}): OnboardingStep {
  if (input.completedAt) return "complete";
  if (!input.profileReady) return "profile";
  if (!input.hasStudent || !input.packageReady) return "student";
  if (!input.hasRecurrence) return "schedule";
  return "finish";
}
