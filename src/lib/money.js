/**
 * Money is handled as integer minor units (BigInt) whenever JS has to do arithmetic.
 * Balances themselves are mutated in SQL (`balance = balance - $1`), never read-modify-write.
 */
export const toCents = (value) => {
  const s = String(value);
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid money value: ${s}`);
  const [whole, frac = ""] = s.split(".");
  const sign = whole.startsWith("-") ? -1n : 1n;
  return sign * (BigInt(whole.replace("-", "")) * 100n + BigInt(frac.padEnd(2, "0")));
};

export const fromCents = (cents) => {
  const neg = cents < 0n;
  const abs = neg ? -cents : cents;
  return `${neg ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
};
