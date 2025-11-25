
// Pricing Constants per 1 Million Tokens
export const PRICE_PER_1M_INPUT_TEXT = 0.30;
export const PRICE_PER_1M_INPUT_AUDIO = 1.00; // Not fully used yet, but good to have
export const PRICE_PER_1M_OUTPUT = 2.50;

export const ESTIMATED_CHARS_PER_TOKEN = 4;

export interface CostEstimate {
  inputTokens: number;
  outputTokens: number; // Estimated
  totalCost: number;
}

export interface ActualUsage {
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
}

export const estimateTokens = (text: string): number => {
  if (!text) return 0;
  return Math.ceil(text.length / ESTIMATED_CHARS_PER_TOKEN);
};

export const calculateCost = (inputTokens: number, outputTokens: number): number => {
  const inputCost = (inputTokens / 1_000_000) * PRICE_PER_1M_INPUT_TEXT;
  const outputCost = (outputTokens / 1_000_000) * PRICE_PER_1M_OUTPUT;
  return inputCost + outputCost;
};

export const formatCurrency = (amount: number): string => {
  // Handle very small numbers (micro-cents)
  if (amount > 0 && amount < 0.01) {
    return `$${amount.toFixed(6)}`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(amount);
};

export const calculateDiffPercentage = (estimated: number, actual: number): string => {
  if (estimated === 0) return "N/A";
  const diff = ((actual - estimated) / estimated) * 100;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(2)}%`;
};
