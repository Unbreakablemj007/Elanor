import { randomInt } from "crypto";
import { todayDay } from "./dates";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion

export type IdPrefix = "P" | "V" | "S" | "L" | "C" | "E" | "M";

/** `PREFIX-YYMMDD-XXXX`, e.g. `S-261013-K7QD` (date in Beirut time). */
export function newId(prefix: IdPrefix): string {
  const day = todayDay().replace(/-/g, "").slice(2);
  let rand = "";
  for (let i = 0; i < 4; i++) rand += ALPHABET[randomInt(ALPHABET.length)];
  return `${prefix}-${day}-${rand}`;
}
