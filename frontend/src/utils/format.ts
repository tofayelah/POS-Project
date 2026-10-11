export function formatCurrency(amount: number | string | undefined | null, currencySymbol = '$'): string {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return `${currencySymbol}0.00`;
  }
  const num = Number(amount);
  return `${currencySymbol}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(value: number | string | undefined | null, decimals = 0): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return '0';
  }
  const num = Number(value);
  return num.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function formatDate(dateString: string | Date | undefined | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(dateString: string | Date | undefined | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return String(dateString);
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
