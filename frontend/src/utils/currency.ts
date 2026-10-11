export function formatCurrency(amount: number | string | undefined | null, currencySymbol = '$'): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return `${currencySymbol}0.00`;
  }
  const num = Number(amount);
  return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAmount(amount: number | string | undefined | null): string {
  return formatCurrency(amount);
}
