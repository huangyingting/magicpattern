export const ACCOUNT_ADMISSION_MODES = ['invitation-only', 'public'] as const;
export type AccountAdmissionMode = (typeof ACCOUNT_ADMISSION_MODES)[number];

export const ACCOUNT_ROLES = ['Admin', 'Editor', 'Viewer'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export function normalizeAccountRole(role?: string | null): AccountRole {
  if (!role) return 'Editor';
  const r = role.trim().toLowerCase();
  if (r === 'admin' || r === 'owner') return 'Admin';
  if (r === 'viewer' || r === 'read') return 'Viewer';
  return 'Editor';
}

export function normalizeAccountEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidAccountEmail(email: string): boolean {
  const normalized = normalizeAccountEmail(email);
  const separator = normalized.indexOf('@');
  return (
    normalized.length <= 320 &&
    separator > 0 &&
    separator === normalized.lastIndexOf('@') &&
    separator < normalized.length - 1 &&
    !/\s/.test(normalized)
  );
}

export function accountAdmissionMode(): AccountAdmissionMode {
  const configured = process.env.ACCOUNT_ADMISSION_MODE?.trim().toLowerCase();
  return configured === 'public' || configured === 'invitation-only'
    ? configured
    : 'invitation-only';
}

export function accountAdmissionPublicOrigin(requestUrl?: string): string {
  const envOrigin =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;
  if (envOrigin) {
    try {
      return new URL(envOrigin).origin;
    } catch {
      // fall through
    }
  }
  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // fall through
    }
  }
  return 'http://localhost:3000';
}

export function accountAdmissionSecretLink(
  path: string,
  token: string,
  requestUrl?: string
): string {
  const origin = accountAdmissionPublicOrigin(requestUrl);
  return new URL(`${path}/${encodeURIComponent(token)}`, origin).toString();
}
