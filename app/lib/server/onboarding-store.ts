import "server-only";

import { createSupabaseAdminClient } from "../supabase/admin";

export type UserOnboardingProfile = {
  avatarSeed: string | null;
  fullName: string | null;
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  userId: string;
};

type UserProfileRow = {
  avatar_seed: string | null;
  full_name: string | null;
  onboarding_completed: boolean;
  onboarding_completed_at: string | null;
  user_id: string;
};

type UserProfileBaseRow = Omit<UserProfileRow, "avatar_seed" | "full_name">;
type UserProfileAvatarRow = Omit<UserProfileRow, "full_name">;

const USER_PROFILES_TABLE = "user_profiles";

function mapProfile(row: UserProfileRow): UserOnboardingProfile {
  return {
    avatarSeed: row.avatar_seed,
    fullName: row.full_name,
    onboardingCompleted: row.onboarding_completed,
    onboardingCompletedAt: row.onboarding_completed_at,
    userId: row.user_id,
  };
}

function mapAvatarProfile(row: UserProfileAvatarRow): UserOnboardingProfile {
  return mapProfile({
    ...row,
    full_name: null,
  });
}

function mapBaseProfile(row: UserProfileBaseRow): UserOnboardingProfile {
  return mapProfile({
    ...row,
    avatar_seed: null,
    full_name: null,
  });
}

function isMissingAvatarSeedColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("avatar_seed"));
}

function isMissingFullNameColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("full_name"));
}

export async function getOrCreateUserOnboardingProfile(
  userId: string,
): Promise<UserOnboardingProfile> {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed: null,
      fullName: null,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      userId,
    };
  }

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed, full_name")
    .eq("user_id", userId)
    .maybeSingle<UserProfileRow>();

  if (isMissingFullNameColumnError(error)) {
    const { data: avatarData, error: avatarError } = await supabase
      .from(USER_PROFILES_TABLE)
      .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
      .eq("user_id", userId)
      .maybeSingle<UserProfileAvatarRow>();

    if (isMissingAvatarSeedColumnError(avatarError)) {
      return getOrCreateBaseProfile(userId);
    }

    if (avatarError) {
      throw new Error(`Unable to load onboarding profile: ${avatarError.message}`);
    }

    if (avatarData) {
      return mapAvatarProfile(avatarData);
    }

    const { data: avatarCreatedProfile, error: avatarInsertError } = await supabase
      .from(USER_PROFILES_TABLE)
      .insert({
        avatar_seed: null,
        onboarding_completed: false,
        onboarding_completed_at: null,
        user_id: userId,
      })
      .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
      .single<UserProfileAvatarRow>();

    if (avatarInsertError) {
      throw new Error(`Unable to create onboarding profile: ${avatarInsertError.message}`);
    }

    return mapAvatarProfile(avatarCreatedProfile);
  }

  if (isMissingAvatarSeedColumnError(error)) {
    return getOrCreateBaseProfile(userId);
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
      full_name: null,
      user_id: userId,
    })
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed, full_name")
    .single<UserProfileRow>();

  if (isMissingFullNameColumnError(insertError)) {
    return getOrCreateAvatarProfile(userId);
  }

  if (isMissingAvatarSeedColumnError(insertError)) {
    return getOrCreateBaseProfile(userId);
  }

  if (insertError) {
    throw new Error(`Unable to create onboarding profile: ${insertError.message}`);
  }

  return mapProfile(createdProfile);
}

async function getOrCreateAvatarProfile(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed: null,
      fullName: null,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      userId,
    };
  }

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
    .eq("user_id", userId)
    .maybeSingle<UserProfileAvatarRow>();

  if (isMissingAvatarSeedColumnError(error)) {
    return getOrCreateBaseProfile(userId);
  }

  if (error) {
    throw new Error(`Unable to load onboarding profile: ${error.message}`);
  }

  if (data) {
    return mapAvatarProfile(data);
  }

  const { data: createdProfile, error: insertError } = await supabase
    .from(USER_PROFILES_TABLE)
    .insert({
      avatar_seed: null,
      onboarding_completed: false,
      onboarding_completed_at: null,
      user_id: userId,
    })
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed")
    .single<UserProfileAvatarRow>();

  if (isMissingAvatarSeedColumnError(insertError)) {
    return getOrCreateBaseProfile(userId);
  }

  if (insertError) {
    throw new Error(`Unable to create onboarding profile: ${insertError.message}`);
  }

  return mapAvatarProfile(createdProfile);
}

async function getOrCreateBaseProfile(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed: null,
      fullName: null,
      onboardingCompleted: false,
      onboardingCompletedAt: null,
      userId,
    };
  }

  const { data, error } = await supabase
    .from(USER_PROFILES_TABLE)
    .select("user_id, onboarding_completed, onboarding_completed_at")
    .eq("user_id", userId)
    .maybeSingle<UserProfileBaseRow>();

  if (error) {
    throw new Error(`Unable to load onboarding profile: ${error.message}`);
  }

  if (data) {
    return mapBaseProfile(data);
  }

  const { data: createdProfile, error: insertError } = await supabase
    .from(USER_PROFILES_TABLE)
    .insert({
      onboarding_completed: false,
      onboarding_completed_at: null,
      user_id: userId,
    })
    .select("user_id, onboarding_completed, onboarding_completed_at")
    .single<UserProfileBaseRow>();

  if (insertError) {
    throw new Error(`Unable to create onboarding profile: ${insertError.message}`);
  }

  return mapBaseProfile(createdProfile);
}

export async function markUserOnboardingCompleted(userId: string) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed: null,
      fullName: null,
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
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed, full_name")
    .single<UserProfileRow>();

  if (isMissingFullNameColumnError(error)) {
    const { data: avatarData, error: avatarError } = await supabase
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
      .single<UserProfileAvatarRow>();

    if (avatarError) {
      throw new Error(`Unable to complete onboarding: ${avatarError.message}`);
    }

    return mapAvatarProfile(avatarData);
  }

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
      fullName: null,
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
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed, full_name")
    .single<UserProfileRow>();

  if (isMissingFullNameColumnError(error)) {
    const { data: avatarData, error: avatarError } = await supabase
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
      .single<UserProfileAvatarRow>();

    if (avatarError) {
      throw new Error(`Unable to save avatar: ${avatarError.message}`);
    }

    return mapAvatarProfile(avatarData);
  }

  if (error) {
    throw new Error(`Unable to save avatar: ${error.message}`);
  }

  return mapProfile(data);
}

export async function updateUserProfile(
  userId: string,
  {
    avatarSeed,
    fullName,
  }: {
    avatarSeed: string | null;
    fullName: string | null;
  },
) {
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return {
      avatarSeed,
      fullName,
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
        full_name: fullName,
        user_id: userId,
      },
      {
        onConflict: "user_id",
      },
    )
    .select("user_id, onboarding_completed, onboarding_completed_at, avatar_seed, full_name")
    .single<UserProfileRow>();

  if (isMissingFullNameColumnError(error)) {
    return updateUserAvatarSeed(userId, avatarSeed);
  }

  if (error) {
    throw new Error(`Unable to save profile: ${error.message}`);
  }

  return mapProfile(data);
}
