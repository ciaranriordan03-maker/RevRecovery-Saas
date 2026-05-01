import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type UserOnboardingProfile = {
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  userId: string;
};

type UserProfileRow = {
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  user_id: string;
};

const USER_PROFILES_TABLE = "user_profiles";

function mapProfile(row: UserProfileRow): UserOnboardingProfile {
  return {
    onboardingCompleted: row.onboarding_completed,
    onboardingCompletedAt: row.onboarding_completed_at,
    userId: row.user_id,
  };
}

export async function getOrCreateUserOnboardingProfile(
  userId: string,
): Promise<UserOnboardingProfile> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      userId,
    };
  }

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, onboarding_completed, onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle<UserProfileRow>();

  if (error) {
    throw new Error(`Unable to load onboarding profile: ${error.message}`);
  }

  if (data) {
    return mapProfile(data);
  }

  const { data: createdProfile, error: insertError } = await supabase
    .from(USER_PROFILES_TABLE)
    .insert({
      onboarding_completed: false,
      onboarding_completed_at: null,
      user_id: userId,
    })
    .select("user_id, onboarding_completed, onboarding_completed_at")
    .single<UserProfileRow>();

  if (insertError) {
    throw new Error(`Unable to create onboarding profile: ${insertError.message}`);
  }

  return mapProfile(createdProfile);
}

export async function markUserOnboardingCompleted(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      onboardingCompleted: true,
      onboardingCompletedAt: new Date().toISOString(),
      userId,
    };
  }

  const completedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .upsert(
      {
        onboarding_completed: true,
        onboarding_completed_at: completedAt,
        user_id: userId,
      },
      {
        onConflict: "user_id",
      },
    )
    .select("user_id, onboarding_completed, onboarding_completed_at")
    .single<UserProfileRow>();

  if (error) {
    throw new Error(`Unable to complete onboarding: ${error.message}`);
  }

  return mapProfile(data);
}
