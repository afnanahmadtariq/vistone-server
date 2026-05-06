/**
 * Normalize org-scoped entity display names for duplicate checks:
 * Unicode NFKC, trim, ASCII-lowercase (case-insensitive "same name").
 */
export function normalizeOrgEntityNameKey(name: string): string {
  if (typeof name !== 'string') return '';
  return name.normalize('NFKC').trim().toLowerCase();
}
