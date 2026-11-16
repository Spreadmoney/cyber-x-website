import Image from "next/image";

/**
 * Icons and marks exported from the Figma file, kept as they are (public/).
 * They are decoration: the words beside them carry the meaning.
 */
export type IconName =
  | "send"
  | "settlements"
  | "search"
  | "electricity"
  | "card"
  | "freeze"
  | "flag"
  | "check"
  | "check-small"
  | "phone"
  | "id-card"
  | "camera"
  | "calendar"
  | "askx-32"
  | "askx-40"
  | "clock"
  | "stop"
  | "add"
  | "bank"
  | "chat"
  | "lock";

const NATURAL: Record<IconName, number> = {
  send: 22,
  settlements: 22,
  search: 22,
  electricity: 22,
  card: 22,
  freeze: 18,
  flag: 18,
  check: 18,
  "check-small": 14,
  phone: 20,
  "id-card": 20,
  camera: 20,
  calendar: 20,
  "askx-32": 32,
  "askx-40": 40,
  clock: 24,
  stop: 24,
  add: 24,
  bank: 24,
  chat: 24,
  lock: 24,
};

export function Icon({
  name,
  size,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const natural = NATURAL[name];
  return (
    <Image
      src={`/icons/${name}.svg`}
      alt=""
      width={natural}
      height={natural}
      unoptimized
      loading="eager"
      className={`shrink-0 ${className}`}
      style={size ? { width: size, height: size } : undefined}
    />
  );
}

/** The Cyber X verified seal (Figma "Verified seal"). */
export function Seal({ size = 32 }: { size?: number }) {
  return (
    <Image
      src="/brand/seal.svg"
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0"
    />
  );
}
