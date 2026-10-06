// POC-only: no login. One synthetic user per browser, created lazily on the
// backend the first time a score needs saving, then cached in localStorage.
// Replace with real auth before any real participant uses this.
import { createUser } from '@workspace/api-client-react';

const USER_ID_KEY = 'rm.userId';
const DEVICE_ID_KEY = 'rm.deviceId';

function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const generated = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, generated);
    return generated;
  } catch {
    return crypto.randomUUID();
  }
}

let pending: Promise<number | null> | null = null;

/** Resolves to this browser's backend user id, creating one on first use. Null if the backend is unreachable. */
export function getOrCreateUserId(): Promise<number | null> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const stored = localStorage.getItem(USER_ID_KEY);
      if (stored) return Number(stored);
    } catch {
      // No storage; fall through to creating a fresh (unpersisted-locally) user.
    }
    try {
      const user = await createUser({ email: `${deviceId()}@device.remembrance.local` });
      try {
        localStorage.setItem(USER_ID_KEY, String(user.id));
      } catch {
        // Still usable for this page load.
      }
      return user.id;
    } catch {
      return null;
    }
  })();
  return pending;
}
