/**
 * Lowercase alias → expanded search query.
 * Add entries here; keys are matched after trim + toLowerCase().
 */
export const aliases: Record<string, string> = {
  tmnt: 'teenage mutant ninja turtles',
  got: 'game of thrones',
  swf: 'street fighter',
  botw: 'breath of the wild',
};

/** Resolve a user search string through the alias table. Unmatched input passes through. */
export function resolveAlias(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const mapped = aliases[trimmed.toLowerCase()];
  return mapped ?? trimmed;
}
