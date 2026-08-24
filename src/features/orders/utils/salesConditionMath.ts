/**
 * Logo sales-condition rate parsing + cumulative net price.
 * Must stay aligned with SatisKosullariHandler.cs
 *
 * FORMULA:
 *   P3*.10     → %10
 *   P3*.2590/1 → %25.90
 *   P3*.26/10  → %2.60
 * The leading P3 is a price variable, not a 3% discount.
 */

const FORMULA_RATE = /\*\s*(\.\d+)\s*(?:\/\s*(\d+(?:[.,]\d+)?))?/;

export function parseLogoFormulaRate(
  formula: string | null | undefined,
): number {
  if (!formula || !formula.trim()) return 0;
  const match = formula.match(FORMULA_RATE);
  if (!match) return 0;
  const numerator = Number(match[1]);
  if (!Number.isFinite(numerator)) return 0;
  let factor = numerator;
  if (match[2]) {
    const divisor = Number(match[2].replace(',', '.'));
    if (Number.isFinite(divisor) && divisor !== 0) {
      factor = factor / divisor;
    }
  }
  return clampRate(factor * 100);
}

export function parseDiscountRate(
  formula: string | null | undefined,
  definition: string | null | undefined = '',
  code: string | null | undefined = '',
): number {
  const fromFormula = parseLogoFormulaRate(formula);
  if (fromFormula > 0) return fromFormula;
  const fromDef = parseLogoFormulaRate(definition);
  if (fromDef > 0) return fromDef;
  const fromCode = parseLogoFormulaRate(code);
  if (fromCode > 0) return fromCode;
  return 0;
}

export function applyCumulativeDiscounts(
  price: number,
  rates: readonly number[],
): number {
  let net = price;
  for (const rate of rates) {
    if (rate > 0) {
      net *= 1 - rate / 100;
    }
  }
  return roundMoney(net);
}

function clampRate(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value * 10_000) / 10_000;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
