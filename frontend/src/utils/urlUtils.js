/**
 * Validates that a URL string is a well-formed absolute HTTPS URL.
 * Rejects dangerous protocols (javascript:, data:, vbscript:), plain HTTP,
 * protocol-relative URLs, relative paths, and non-string values.
 */
export function isSafeHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
