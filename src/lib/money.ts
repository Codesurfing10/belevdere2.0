/** Converts a dollar amount (Float in DB) to integer cents. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** True when a provider-reported decimal string equals the expected amount to the cent. */
export function sameAmount(providerValue: string | number | undefined | null, expected: number): boolean {
  if (providerValue === undefined || providerValue === null || providerValue === '') return false;
  const n = typeof providerValue === 'number' ? providerValue : Number(providerValue);
  return Number.isFinite(n) && toCents(n) === toCents(expected);
}
