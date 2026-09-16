export function formatTokens(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : String(n);
}

// Rough estimate, not billing-accurate (see ROUGH_COST_PER_1M_TOKENS in the
// AI call sites) -- under a cent still real usage, just not worth implying
// false precision with "$0.00".
export function formatCost(cost: number): string {
  return cost > 0 && cost < 0.01 ? "<$0.01" : `$${cost.toFixed(2)}`;
}
