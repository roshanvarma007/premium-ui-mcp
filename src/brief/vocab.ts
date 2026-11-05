// Tiny, deterministic text normalization for brief matching. No NLP dependencies.

/** Words that carry no signal about which direction fits (everyone wants these). */
const NOISE = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'for',
  'of',
  'to',
  'in',
  'on',
  'with',
  'my',
  'our',
  'your',
  'app',
  'apps',
  'application',
  'website',
  'site',
  'web',
  'page',
  'mobile',
  'android',
  'ios',
  'platform',
  'tool',
  'product',
  'service',
  'thing',
  'something',
  'stuff',
  'project',
  'ui',
  'premium',
  'modern',
  'beautiful',
  'nice',
  'cool',
  'sleek',
  'awesome',
  'good',
  'great',
  'stunning',
  'amazing',
  'pretty',
  'best',
  'new',
  'simple',
  'build',
  'make',
  'create',
  'design',
  'like',
  'that',
  'this',
  'it',
  'is',
  'be',
  'people',
  'users',
  'user',
  'who',
  'want',
  'feel',
]);

/** Raw word -> words it implies. Stemmed once at load (see SYNONYMS below). */
const RAW_SYNONYMS: Record<string, string[]> = {
  fintech: ['finance', 'bank', 'payment'],
  financial: ['finance'],
  money: ['finance', 'payment'],
  budget: ['budgeting', 'finance'],
  stocks: ['invest', 'finance'],
  trading: ['invest', 'finance'],
  crypto: ['invest', 'finance', 'wallet'],
  loan: ['lend', 'finance'],
  loans: ['lend', 'finance'],
  bookkeeping: ['accounting', 'finance'],
  invoice: ['accounting', 'payment'],
  invoicing: ['accounting', 'payment'],
  expense: ['budgeting', 'accounting'],
  expenses: ['budgeting', 'accounting'],
  neobank: ['bank', 'finance'],
  checkout: ['payment'],
  trust: ['trustworthy'],
  trusted: ['trustworthy'],
  reliable: ['trustworthy'],
  secure: ['trustworthy'],
  safe: ['trustworthy'],
  accurate: ['precise'],
  corporate: ['professional'],
  enterprise: ['professional'],
};

/** Very small suffix stripper; consistent rather than linguistically perfect. */
export function stem(word: string): string {
  let w = word.toLowerCase();
  for (const suffix of ['ments', 'ment', 'ings', 'ing', 'ies', 'es', 's', 'al', 'ly', 'y', 'e']) {
    if (w.length - suffix.length >= 3 && w.endsWith(suffix)) {
      w = w.slice(0, -suffix.length);
      break;
    }
  }
  return w;
}

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']s\b/g, '')
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 0);
}

/** Meaningful stems of a text, expanded with synonyms. Sorted for determinism. */
export function concepts(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of words(text)) {
    if (NOISE.has(w)) continue;
    const s = stem(w);
    out.add(s);
    for (const extra of SYNONYMS.get(s) ?? []) out.add(extra);
  }
  return out;
}

/** True if every meaningful stem of `term` is present in `bag`. */
export function termMatches(term: string, bag: Set<string>): boolean {
  const stems = words(term)
    .filter((w) => !NOISE.has(w))
    .map(stem);
  return stems.length > 0 && stems.every((s) => bag.has(s));
}

const SYNONYMS = new Map<string, string[]>(
  Object.entries(RAW_SYNONYMS).map(([k, v]) => [stem(k), v.map(stem)]),
);
