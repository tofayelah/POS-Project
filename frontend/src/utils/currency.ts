export const formatCurrency = (value: number | string): string => {
  return '৳ ' + Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
