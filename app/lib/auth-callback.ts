type AuthCallbackParams = {
  code?: string;
  token_hash?: string;
  type?: string;
};

export function buildPasswordRecoveryCallbackPath(params: AuthCallbackParams) {
  const searchParams = new URLSearchParams();

  if (params.code) {
    searchParams.set("code", params.code);
  } else if (params.token_hash) {
    searchParams.set("token_hash", params.token_hash);
    searchParams.set("type", params.type || "recovery");
  } else {
    return null;
  }

  searchParams.set("next", "/reset-password");
  return `/auth/confirm?${searchParams.toString()}`;
}
