import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shellSource = readFileSync(
  new URL("../app/components/dashboard/app-shell.tsx", import.meta.url),
  "utf8",
);
const signOutSource = readFileSync(
  new URL("../app/components/dashboard/sign-out-form.tsx", import.meta.url),
  "utf8",
);
const authActionsSource = readFileSync(
  new URL("../app/login/actions.ts", import.meta.url),
  "utf8",
);

describe("dashboard sign out", () => {
  it("offers the sign-out action on desktop and mobile dashboard shells", () => {
    expect(shellSource.match(/<SignOutForm/g)).toHaveLength(2);
    expect(shellSource).toContain("<SignOutForm compact />");
  });

  it("uses a real submit button backed by the server-side logout action", () => {
    expect(signOutSource).toContain('import { logout } from "../../login/actions"');
    expect(signOutSource).toContain("<form action={logout}>");
    expect(signOutSource).toContain('type="submit"');
    expect(signOutSource).toContain("Sign out");
    expect(authActionsSource).toContain("await supabase.auth.signOut()");
    expect(authActionsSource).toContain('redirect("/login")');
  });
});
