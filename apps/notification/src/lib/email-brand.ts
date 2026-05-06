/**
 * Brand colors for HTML emails — keep in sync with
 * `vistone/apps/main-app/app/globals.css` (`:root` / `.theme` tokens).
 */
export const VISTONE_EMAIL = {
  background: "#eef2f8",
  card: "#ffffff",
  foreground: "#0f172a",
  mutedForeground: "#64748b",
  /** Slightly lighter for fine print / link fallbacks */
  subtleText: "#94a3b8",
  primary: "#1a365d",
  secondary: "#2c5282",
  accent: "#3b82c4",
  light: "#e4eaf2",
  onPrimary: "#f8fafc",
  white: "#ffffff",
  /** Header + primary CTA (matches app primary → secondary → accent) */
  gradient135:
    "linear-gradient(135deg, #1a365d 0%, #2c5282 52%, #3b82c4 100%)",
} as const;

/**
 * Absolute URL to logo assets in main-app `public/` (same as the web app).
 * Override with `VISTONE_EMAIL_LOGO_URL` (full URL) for a CDN; otherwise
 * `FRONTEND_URL` + `/Logo.svg` or `/logo-dark.svg`.
 */
export function getVistoneEmailLogoUrl(
  variant: "onGradient" | "onLight" = "onGradient",
): string {
  const oneOff = process.env.VISTONE_EMAIL_LOGO_URL?.trim();
  if (oneOff) {
    return oneOff;
  }
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  const file = variant === "onGradient" ? "/Logo.svg" : "/logo-dark.svg";
  return `${base}${file}`;
}

/**
 * Top banner for notification emails: white mark on brand gradient.
 * Optional subtitle (e.g. "Client Portal") in on-primary text.
 */
export function emailGradientHeaderHtml(subtitle?: string): string {
  const logoUrl = getVistoneEmailLogoUrl("onGradient");
  const sub = subtitle
    ? `<p style="margin: 14px 0 0; color: ${VISTONE_EMAIL.onPrimary}; font-size: 14px; opacity: 0.95;">${subtitle}</p>`
    : "";
  return `<img src="${logoUrl}" alt="Vistone" width="160" height="160" style="height: 44px; width: auto; max-width: 200px; display: inline-block; border: 0; outline: none; text-decoration: none;" />${sub}`;
}
