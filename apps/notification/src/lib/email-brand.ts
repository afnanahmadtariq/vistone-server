/**
 * Brand colors for HTML emails — keep in sync with
 * `vistone/apps/main-app/app/globals.css` (`:root` / `.theme` tokens)
 * and the sidebar top in `vistone/apps/main-app/app/components/Sidebar.tsx`.
 */
import { VISTONE_LOGO_PNG_BASE64 } from "./vistone-logo-email-png-base64";

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
 * Stable CID used to reference the embedded logo from email HTML. Pair
 * with the attachment returned by `getVistoneEmailLogoAttachment` so the
 * mark renders without any external network request.
 */
export const VISTONE_EMAIL_LOGO_CID = "vistone-logo";

export interface VistoneEmailAttachment {
  filename: string;
  content: Buffer;
  cid: string;
  contentType: string;
  contentDisposition: "inline";
}

/**
 * Nodemailer attachment for the embedded brand logo (PNG). Gmail and most
 * webmail clients do not render SVG in multipart/related CID parts; PNG is
 * embedded as base64 in the bundle (no URLs, no filesystem at send time).
 */
export function getVistoneEmailLogoAttachment(): VistoneEmailAttachment {
  return {
    filename: "vistone-logo.png",
    content: Buffer.from(VISTONE_LOGO_PNG_BASE64, "base64"),
    cid: VISTONE_EMAIL_LOGO_CID,
    contentType: "image/png",
    contentDisposition: "inline",
  };
}

/**
 * Top banner for notification emails. Renders the white sidebar mark
 * (logo + "Vistone" wordmark) on the brand gradient, matching the
 * top of the app sidebar. Optional subtitle sits below in on-primary text.
 */
export function emailGradientHeaderHtml(subtitle?: string): string {
  const sub = subtitle
    ? `<p style="margin: 14px 0 0; color: ${VISTONE_EMAIL.onPrimary}; font-size: 14px; opacity: 0.95;">${subtitle}</p>`
    : "";
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="display: inline-block; border-collapse: collapse;">
      <tr>
        <td valign="middle" style="padding-right: 14px; line-height: 0;">
          <img src="cid:${VISTONE_EMAIL_LOGO_CID}" alt="" width="42" height="42" role="presentation" style="display: block; width: 42px; height: 42px; border: 0; outline: none; text-decoration: none;" />
        </td>
        <td valign="middle" style="vertical-align: middle;">
          <span style="color: ${VISTONE_EMAIL.white}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.025em; line-height: 1;">Vistone</span>
        </td>
      </tr>
    </table>
    ${sub}
  `;
}
