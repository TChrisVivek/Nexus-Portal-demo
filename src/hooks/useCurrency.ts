export function useCurrency() {
  return 'INR';
}

export function formatCurrency(amount: number, currency₹: string) {
  return new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 0 
  }).format(amount);
}
