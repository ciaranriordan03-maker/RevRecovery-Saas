import { describe, expect, it, vi } from "vitest";
import { collectStripePages } from "../app/lib/stripe/pagination";

describe("Stripe pagination", () => {
  it("collects every page and advances with the last Stripe id", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ id: "one" }, { id: "two" }], has_more: true })
      .mockResolvedValueOnce({ data: [{ id: "three" }], has_more: false });

    await expect(collectStripePages(fetchPage)).resolves.toEqual([
      { id: "one" },
      { id: "two" },
      { id: "three" },
    ]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, undefined);
    expect(fetchPage).toHaveBeenNthCalledWith(2, "two");
  });

  it("fails closed if Stripe says another page exists without a cursor", async () => {
    await expect(
      collectStripePages(async () => ({ data: [], has_more: true })),
    ).rejects.toThrow("did not advance");
  });

  it("bounds unexpectedly long pagination", async () => {
    let id = 0;
    await expect(
      collectStripePages(
        async () => ({ data: [{ id: String(++id) }], has_more: true }),
        { maxPages: 2 },
      ),
    ).rejects.toThrow("safety page limit");
  });
});
