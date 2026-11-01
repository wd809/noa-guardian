/**
 * Short legal notice inside the app. The full, binding version lives in
 * docs/LEGAL-NOTICE.md; this module is its faithful summary for the
 * /aviso-legal view and the first-run banner. When a clause changes here,
 * change the document too.
 */

export interface LegalSection {
  title: string;
  body: string;
}

export const LEGAL_STORAGE_KEY = 'guardian.legalOk';
export const LEGAL_VERSION = '1.0 · Oct-30-2026';

export const LEGAL_BANNER =
  'NOA Guardian is a prototype: informational guidance, not legal advice ' +
  'and not an emergency service. In an emergency, call 911.';

export const LEGAL_SECTIONS: LegalSection[] = [
  {
    title: 'Not legal advice',
    body: 'Citizen explains laws with official citations, but it is not legal advice and creates no attorney-client relationship. For any significant decision, consult a licensed attorney.',
  },
  {
    title: 'Not an emergency service',
    body: 'Alerts can be delayed or miss your area. In an immediate emergency, call 911.',
  },
  {
    title: 'No safety guarantee',
    body: 'No alerts means no reports in the sources checked, never that there is no danger. The app promises no safe routes or safe areas.',
  },
  {
    title: 'Verify with the official source',
    body: 'Every answer carries its citations and every corpus piece its verified currency. AI can err: the linked source is the one that rules.',
  },
  {
    title: 'Use at your own risk',
    body: 'You use this prototype at your own risk. A project by WD (Seal of Trust Services LLC). Full notice in the repo: docs/LEGAL-NOTICE.md.',
  },
];

type StoreRead = (key: string) => string | null;
type StoreWrite = (key: string, value: string) => void;

function safeRead(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* Without storage the banner shows again; the app keeps working. */
  }
}

/** true once this device has accepted the notice. */
export function hasAcceptedLegal(read: StoreRead = safeRead): boolean {
  try {
    return read(LEGAL_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Stores the notice acceptance on this device. */
export function acceptLegal(write: StoreWrite = safeWrite): void {
  try {
    write(LEGAL_STORAGE_KEY, '1');
  } catch {
    /* Without storage there is nothing to store. */
  }
}
