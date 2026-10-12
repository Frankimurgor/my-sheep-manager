// src/utils/money.ts
// Currency formatting for My Sheep Manager.

function withThousands(n: number, decimals: number): string {
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const intWithCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return decimals > 0 ? `${intWithCommas}.${decPart}` : intWithCommas;
}

/** Full precision: "KSh 5,400.00". */
export function money(n: number, symbol: string): string {
  const sign = n < 0 ? '−' : '';
  return `${sign}${symbol} ${withThousands(Math.abs(n), 2)}`;
}

/** Compact form for narrow surfaces. */
export function moneyCompact(n: number, symbol: string): string {
  const sign = n < 0 ? '−' : '';
  const abs = Math.abs(n);
  let body: string;
  if (abs < 10_000) {
    body = withThousands(abs, 0);
  } else if (abs < 1_000_000) {
    body = `${(abs / 1000).toFixed(1)}K`;
  } else if (abs < 1_000_000_000) {
    body = `${(abs / 1_000_000).toFixed(1)}M`;
  } else {
    body = `${(abs / 1_000_000_000).toFixed(1)}B`;
  }
  return `${sign}${symbol} ${body}`;
}

export const CURRENCY_SYMBOL: Record<string, string> = {
  KES: 'KSh',
  USD: '$',
  EUR: '€',
  GBP: '£',
  NGN: '₦',
  ZAR: 'R',
  AUD: 'A$',
  INR: '₹',
};

export function symbolFor(code: string): string {
  return CURRENCY_SYMBOL[code] ?? code;
}