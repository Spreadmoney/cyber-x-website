/**
 * Search for the blog and Help (W8.4). Runs on the server over the files,
 * so it needs no database and no outside service.
 *
 * - Every word typed must appear (small words like "how" and "my" are
 *   skipped), at the start of a word: "withdraw" finds "withdrawals", and
 *   "freeze" finds "freezing".
 * - A match in the title counts most, then the summary, then the text;
 *   a word found in several places counts for each.
 * - With nothing found, "Did you mean" offers the closest real words, but
 *   only when they would find something.
 */

export interface SearchField {
  text: string;
  weight: number;
}

export interface Searchable {
  id: string;
  fields: readonly SearchField[];
}

const STOPWORDS = new Set(
  "a an and are am as at be by can do does for from has have how i if in is it its me my of on or our so that the this to was we what when where which who why will with you your".split(
    " ",
  ),
);

/** Lower case, no accents or apostrophes, split into words. */
export function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’‘]/g, "")
    .split(/[^a-z0-9₦]+/)
    .filter(Boolean);
}

/** The words of a search worth looking for. */
export function queryTerms(query: string): string[] {
  const all = words(query.slice(0, 100));
  const kept = all.filter((word) => !STOPWORDS.has(word));
  return [...new Set(kept.length ? kept : all)];
}

/** "freezing", "freezes" and "freeze" all start with "freez". */
export function stem(term: string): string {
  for (const ending of ["ing", "ed", "es", "s", "e"]) {
    if (term.endsWith(ending) && term.length - ending.length >= 3) {
      return term.slice(0, -ending.length);
    }
  }
  return term;
}

const matches = (term: string, word: string) =>
  term.length < 2 ? word === term : word.startsWith(stem(term));

export function search(items: readonly Searchable[], query: string): string[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const indexed = items.map((item) => ({
    id: item.id,
    fields: item.fields.map((field) => ({ weight: field.weight, words: words(field.text) })),
  }));
  const scored: { id: string; score: number; order: number }[] = [];
  indexed.forEach((item, order) => {
    let score = 0;
    for (const term of terms) {
      // A word found in the title and the summary counts more than one found once.
      const found = item.fields
        .filter((field) => field.words.some((word) => matches(term, word)))
        .reduce((sum, field) => sum + field.weight, 0);
      if (!found) return;
      score += found;
    }
    scored.push({ id: item.id, score, order });
  });
  return scored.sort((a, b) => b.score - a.score || a.order - b.order).map((hit) => hit.id);
}

/** Edits between two words, a swap of two letters counting as one. */
export function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(rows[i - 1]![j]! + 1, rows[i]![j - 1]! + 1, rows[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, rows[i - 2]![j - 2]! + 1);
      }
      rows[i]![j] = best;
    }
  }
  return rows[a.length]![b.length]!;
}

/** "wirhdraw" → "withdraw", or null when there is nothing better to offer. */
export function suggest(items: readonly Searchable[], query: string): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const field of item.fields) {
      for (const word of words(field.text)) {
        if (word.length >= 3) counts.set(word, (counts.get(word) ?? 0) + 1);
      }
    }
  }
  const vocabulary = [...counts.keys()];
  let changed = false;
  const fixed = queryTerms(query).map((term) => {
    if (vocabulary.some((word) => matches(term, word))) return term;
    // One slip in a short word, two in a long one, and the first letter right.
    const limit = term.length >= 8 ? 2 : 1;
    const best = vocabulary
      .filter((word) => word[0] === term[0])
      .map((word) => ({ word, d: distance(term, word), n: counts.get(word)! }))
      .filter((c) => c.d <= limit)
      .sort((x, y) => x.d - y.d || y.n - x.n || x.word.localeCompare(y.word))[0];
    if (!best) return term;
    changed = true;
    return best.word;
  });
  if (!changed) return null;
  const suggestion = fixed.join(" ");
  return search(items, suggestion).length ? suggestion : null;
}
