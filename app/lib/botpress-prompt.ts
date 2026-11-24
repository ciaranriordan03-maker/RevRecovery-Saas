export const BOTPRESS_PROMPT_DELAY_MS = 10_000;
export const BOTPRESS_PROMPT_STORAGE_KEY =
  "revrecovery:botpress-invitation-seen:session:v1";

type PromptStorage = Pick<Storage, "getItem" | "setItem">;

export function shouldShowBotpressPrompt(storage: PromptStorage | undefined) {
  if (!storage) return true;

  try {
    return storage.getItem(BOTPRESS_PROMPT_STORAGE_KEY) !== "seen";
  } catch {
    return true;
  }
}

export function markBotpressPromptSeen(storage: PromptStorage | undefined) {
  if (!storage) return;

  try {
    storage.setItem(BOTPRESS_PROMPT_STORAGE_KEY, "seen");
  } catch {
    // Storage can be unavailable in privacy-restricted browsing contexts.
  }
}
