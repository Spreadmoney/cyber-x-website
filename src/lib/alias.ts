// Copied from Codebase (src/lib/alias.ts) by `npm run sync:shared`. Change it there, then sync. Never edit it here.

/**
 * The alias: the short name people type to pay someone (ACC 2.08b), instead
 * of the long Cyber X ID. Rule 9: never a phone or account number.
 *
 * The database is the law (is_valid_alias, Phase 1.4). These are the same
 * rules, so the screen can say what's wrong as the person types:
 *
 * - 3 to 20 characters: lower-case letters, digits, dots and underscores;
 * - starts and ends with a letter or digit, no two dots or underscores
 *   together;
 * - at least one letter, so it can never be a phone or account number;
 * - no reserved word as any part between dots and underscores, and never
 *   "cyberx", so nobody can pose as Cyber X or an authority.
 */
export const ALIAS_MIN = 3;
export const ALIAS_MAX = 20;

/** Exactly the list in the database (migration alias_reserved_words_anywhere). */
export const RESERVED_ALIAS_WORDS = [
  "admin",
  "administrator",
  "bank",
  "cbn",
  "compliance",
  "cyber",
  "fraud",
  "help",
  "helpdesk",
  "info",
  "moderator",
  "official",
  "payments",
  "root",
  "security",
  "staff",
  "support",
  "system",
  "team",
  "verified",
  "x",
] as const;

const SHAPE = /^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$/;
const RESERVED = new Set<string>(RESERVED_ALIAS_WORDS);

/** Letters with hooks that don't come apart into a plain letter and a mark (Hausa). */
const HOOKED: Readonly<Record<string, string>> = { ƙ: "k", ɗ: "d", ɓ: "b", ƴ: "y" };

/** Lower case, plain letters: Ọláwálé becomes olawale. */
function plain(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[ƙɗɓƴ]/g, (letter) => HOOKED[letter] ?? letter);
}

/**
 * What was typed, tidied the harmless ways: no "@" in front, no spaces,
 * lower case, tone marks dropped. Anything else is left for aliasProblem to
 * explain; nothing is silently thrown away.
 */
export function normalizeAlias(input: string): string {
  return plain(input.replace(/\s+/g, "").replace(/^@+/, ""));
}

export function isValidAlias(alias: string): boolean {
  return (
    SHAPE.test(alias) &&
    !/[._]{2}/.test(alias) &&
    /[a-z]/.test(alias) &&
    !/cyber[._]?x/.test(alias) &&
    !alias.split(/[._]/).some((part) => RESERVED.has(part))
  );
}

export const ALIAS_MESSAGES = {
  characters: "Use letters, numbers, dots and underscores only.",
  tooLong: `Keep it to ${ALIAS_MAX} characters or fewer.`,
  start: "Start with a letter or number.",
  end: "End with a letter or number.",
  doubled: "Don’t put two dots or underscores together.",
  noLetter: "Include at least one letter.",
  reserved: "That alias can’t be used. Try another.",
} as const;

export interface AliasProblem {
  message: string;
  /**
   * True when the problem is certain whatever is typed next (a character
   * that isn't allowed, too long). The others may just be an alias half
   * typed ("ayo." on the way to "ayo.okafor"), so the screen waits for a
   * pause before saying them.
   */
  certain: boolean;
}

/**
 * What's wrong with a tidied alias, or null. Too short is not a problem to
 * announce: it is simply not finished yet.
 */
export function aliasProblem(alias: string): AliasProblem | null {
  if (alias === "") return null;
  if (/[^a-z0-9._]/.test(alias)) return { message: ALIAS_MESSAGES.characters, certain: true };
  if (alias.length > ALIAS_MAX) return { message: ALIAS_MESSAGES.tooLong, certain: true };
  if (/^[._]/.test(alias)) return { message: ALIAS_MESSAGES.start, certain: true };
  if (/[._]{2}/.test(alias)) return { message: ALIAS_MESSAGES.doubled, certain: true };
  if (alias.length < ALIAS_MIN) return null;
  if (/[._]$/.test(alias)) return { message: ALIAS_MESSAGES.end, certain: false };
  if (!/[a-z]/.test(alias)) return { message: ALIAS_MESSAGES.noLetter, certain: false };
  if (!isValidAlias(alias)) return { message: ALIAS_MESSAGES.reserved, certain: false };
  return null;
}

/** The right length to be checked (it may still have a problem). */
export function isCompleteAlias(alias: string): boolean {
  return alias.length >= ALIAS_MIN && alias.length <= ALIAS_MAX;
}

/**
 * An alias to start from, made of the first name: "Mary Jane" becomes
 * mary.jane, "Ọláwálé" olawale. Empty when the name can't make one (too
 * short, or a reserved word).
 */
export function aliasFromName(firstName: string): string {
  const alias = plain(firstName)
    .replace(/[\s-]+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, ALIAS_MAX)
    .replace(/^\.+|\.+$/g, "");
  return isValidAlias(alias) ? alias : "";
}

/** Room for an ending: the stem cut so stem + ending fits, with no dot or underscore left dangling. */
function withEnding(stem: string, ending: string): string {
  return stem.slice(0, ALIAS_MAX - ending.length).replace(/[._]+$/, "") + ending;
}

/**
 * Aliases to offer when the one asked for is taken (ACC 2.08c), best first.
 * Built from the alias they wanted and their first name, with two-digit
 * numbers from `twoDigits` (random on the server). Never from the phone
 * number: an alias is public. The database then keeps the free ones.
 */
export function aliasCandidates(
  wanted: string,
  firstName: string,
  twoDigits: () => number,
): string[] {
  const fromName = aliasFromName(firstName);
  const number = () => String(10 + (Math.abs(Math.trunc(twoDigits())) % 90));
  const stems = [wanted, fromName].filter(
    (stem, index, all) => stem !== "" && all.indexOf(stem) === index,
  );

  const candidates: string[] = [];
  if (fromName !== "" && fromName !== wanted) candidates.push(fromName);
  if (fromName !== "" && !fromName.includes(wanted) && !wanted.includes(fromName)) {
    candidates.push(withEnding(wanted, `.${fromName}`), withEnding(fromName, `.${wanted}`));
  }
  for (let round = 0; round < 3; round += 1) {
    for (const stem of stems) candidates.push(withEnding(stem, number()));
  }
  for (const stem of stems) candidates.push(withEnding(stem, `_${number()}`));

  return candidates.filter(
    (candidate, index) =>
      candidate !== wanted && isValidAlias(candidate) && candidates.indexOf(candidate) === index,
  );
}
