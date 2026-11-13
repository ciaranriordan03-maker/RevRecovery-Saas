export type StripePage<T> = {
  data: T[];
  has_more: boolean;
};

export async function collectStripePages<T extends { id: string }>(
  fetchPage: (startingAfter?: string) => Promise<StripePage<T>>,
  options: { maxPages?: number } = {},
) {
  const maxPages = options.maxPages ?? 10_000;
  const records: T[] = [];
  let startingAfter: string | undefined;

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    const page = await fetchPage(startingAfter);
    records.push(...page.data);

    if (!page.has_more) {
      return records;
    }

    const lastId = page.data.at(-1)?.id;
    if (!lastId || lastId === startingAfter) {
      throw new Error("Stripe pagination did not advance.");
    }
    startingAfter = lastId;
  }

  throw new Error("Stripe pagination exceeded the safety page limit.");
}
