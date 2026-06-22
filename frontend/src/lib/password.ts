/**
 * Generate a strong, human-typeable password for a new shop owner. Uses the
 * crypto RNG and a charset that avoids visually ambiguous characters (0/O, 1/l/I)
 * so credentials are easy to read aloud and re-type.
 */
const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generatePassword(length = 12): string {
  const out: string[] = [];
  const buf = new Uint32Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(buf);
    for (let i = 0; i < length; i++) out.push(CHARS[buf[i] % CHARS.length]);
  } else {
    for (let i = 0; i < length; i++) out.push(CHARS[Math.floor(Math.random() * CHARS.length)]);
  }
  return out.join("");
}
