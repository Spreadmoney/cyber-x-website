/** One search, from ?q=: the first value, trimmed, at most 100 letters. */
export function readQuery(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? (value[0] ?? "") : (value ?? "")).trim().slice(0, 100);
}
