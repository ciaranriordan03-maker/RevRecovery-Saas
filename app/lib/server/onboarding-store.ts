import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type UserOnboardingProfile = {
  avatarSeed: string | null;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  userId: string;
};

type UserProfileRow = {
  avatar_seed: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  user_id: string;
};

type UserProfileBaseRow = Omit<UserProfileRow, "avatar_seed">;

const USER_PROFILES_TABLE = "user_profiles";

function mapProfile(row: UserProfileRow): UserOnboardingProfile {
  return {
    avatarSeed: row.avatar_seed,
    onboardingCompleted: row.onboarding_completed,
    onboardingCompletedAt: row.onboarding_completed_at,
    userId: row.user_id,
  };
}

function mapBaseProfile(row: UserProfileBaseRow): UserOnboardingProfile {
  return mapProfile({
    ...row,
    avatar_seed: null,
  });
}

function isMissingAvatarSeedColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("avatar_seed"));
}

export async function getOrCreateUserOnboardingProfile(
  userId: string,
): Promise<UserOnboardingProfile> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed: null,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      userId,
    };
  }

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
    .eq("user_id", userId)
    .maybeSingle<UserProfileRow>();

  if (isMissingAvatarSeedColumnError(error)) {
    const { data: baseData, error: baseError } = await supabase
      .from(USER_PROFILES_TABLE)
      .select("user_id, onboarding_completed, onboarding_completed_at")
      .eq("user_id", userId)
      .maybeSingle<UserProfileBaseRow>();

    if (baseError) {
      throw new Error(`Unable to load onboarding profile: ${baseError.message}`);
    }

    if (baseData) {
      return mapBaseProfile(baseData);
    }

    const { data: baseCreatedProfile, error: baseInsertError } = await supabase
      .from(USER_PROFILES_TABLE)
      .insert({
        onboarding_completed: false,
        onboarding_completed_at: null,
        user_id: userId,
      })
      .select("user_id, onboarding_completed, onboarding_completed_at")
      .single<UserProfileBaseRow>();

    if (baseInsertError) {
      throw new Error(`Unable to create onboarding profile: ${baseInsertError.message}`);
    }

    return mapBaseProfile(baseCreatedProfile);
  }

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
      avatar_seed: null,
      user_id: userId,
    })
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
    .single<UserProfileRow>();

  if (isMissingAvatarSeedColumnError(insertError)) {
    const { data: baseCreatedProfile, error: baseInsertError } = await supabase
      .from(USER_PROFILES_TABLE)
      .insert({
        onboarding_completed: false,
        onboarding_completed_at: null,
        user_id: userId,
      })
      .select("user_id, onboarding_completed, onboarding_completed_at")
      .single<UserProfileBaseRow>();

    if (baseInsertError) {
      throw new Error(`Unable to create onboarding profile: ${baseInsertError.message}`);
    }

    return mapBaseProfile(baseCreatedProfile);
  }

  if (insertError) {
    throw new Error(`Unable to create onboarding profile: ${insertError.message}`);
  }

  return mapProfile(createdProfile);
}

export async function markUserOnboardingCompleted(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed: null,
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
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
    .single<UserProfileRow>();

  if (isMissingAvatarSeedColumnError(error)) {
    const { data: baseData, error: baseError } = await supabase
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
      .single<UserProfileBaseRow>();

    if (baseError) {
      throw new Error(`Unable to complete onboarding: ${baseError.message}`);
    }

    return mapBaseProfile(baseData);
  }

  if (error) {
    throw new Error(`Unable to complete onboarding: ${error.message}`);
  }

  return mapProfile(data);
}

export async function updateUserAvatarSeed(userId: string, avatarSeed: string | null) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      userId,
    };
  }

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .upsert(
      {
        avatar_seed: avatarSeed,
        user_id: userId,
      },
      {
        onConflict: "user_id",
      },
    )
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
    .single<UserProfileRow>();

  if (error) {
    throw new Error(`Unable to save avatar: ${error.message}`);
  }

  return mapProfile(data);
}
