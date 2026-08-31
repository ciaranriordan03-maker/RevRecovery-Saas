export type CurrencyAmount = {
  amount: number;
  currency: string | null;
};

type CurrencyAmountInput = {
  amount: number;
  currency: string | null | undefined;
};

function normalizeCurrency(currency: string | null | undefined) {
  const normalized = currency?.trim().toLowerCase() ?? "";
  return /^[a-z]{3}$/.test(normalized) ? normalized : null;
}

export function aggregateCurrencyAmounts(
  amounts: CurrencyAmountInput[],
): CurrencyAmount[] {
  const totals = new Map<string | null, number>();

  for (const { amount, currency } of amounts) {
    const normalizedCurrency = normalizeCurrency(currency);
    totals.set(normalizedCurrency, (totals.get(normalizedCurrency) ?? 0) + amount);
  }

  return Array.from(totals, ([currency, amount]) => ({ amount, currency })).sort(
    (left, right) => {
      if (left.currency === null) return 1;
      if (right.currency === null) return -1;
      return left.currency.localeCompare(right.currency);
    },
  );
}

function formatCurrencyAmount({ amount, currency }: CurrencyAmount) {
  if (!currency) {
    return `${new Intl.NumberFormat("en-US", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount / 100)} (currency unknown)`;
  }

  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    style: "currency",
  }).format(amount / 100);
}

export function formatCurrencyAmounts(
  amounts: CurrencyAmount[],
  emptyCurrency = "usd",
) {
  if (amounts.length === 0) {
    return formatCurrencyAmount({ amount: 0, currency: normalizeCurrency(emptyCurrency) });
  }

  return amounts.map(formatCurrencyAmount).join(" + ");
}
