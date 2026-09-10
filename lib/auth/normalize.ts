/**
 * Shared identity normalization so nobody suffers over formatting:
 * any email domain works (gmail, outlook, college, …), phones accept
 * 91 / +91 / 0 prefixes and autocomplete spacing.
 */

/** Trim + lowercase an email for comparison and storage. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalize an Indian phone number from autocomplete-friendly input:
 * strips spaces/dashes/parens, converts 91… / 0… / 10-digit to +91…,
 * leaves other international numbers (+…) untouched.
 * Returns "" when nothing usable remains.
 */
export function normalizePhone(input: string | null | undefined): string {
  if (!input) return ""
  let d = input.replace(/[\s\-().]/g, "")
  if (!d) return ""
  if (d.startsWith("+")) {
    return /^\+\d{10,15}$/.test(d) ? d : ""
  }
  d = d.replace(/\D/g, "")
  if (!d) return ""
  if (d.length === 12 && d.startsWith("91")) return `+${d}`
  if (d.length === 11 && d.startsWith("0")) return `+91${d.slice(1)}`
  if (d.length === 10) return `+91${d}`
  return d.length >= 7 && d.length <= 15 ? `+${d}` : ""
}

/** Zod-compatible phone check message helper. */
export const PHONE_ERROR = "Enter a valid phone number (10 digits, +91 / 91 / 0 prefix ok)."
