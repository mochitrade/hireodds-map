/** Participating top-25 universities — .edu (or school) email domains we accept. */

export interface School {
  id: string;
  name: string;
  short: string;
  domains: string[]; // email domain suffixes, lowercase
}

export const TOP_25_SCHOOLS: School[] = [
  { id: 'princeton', name: 'Princeton University', short: 'Princeton', domains: ['princeton.edu'] },
  { id: 'mit', name: 'Massachusetts Institute of Technology', short: 'MIT', domains: ['mit.edu'] },
  { id: 'harvard', name: 'Harvard University', short: 'Harvard', domains: ['harvard.edu', 'college.harvard.edu', 'hbs.edu'] },
  { id: 'stanford', name: 'Stanford University', short: 'Stanford', domains: ['stanford.edu'] },
  { id: 'yale', name: 'Yale University', short: 'Yale', domains: ['yale.edu'] },
  { id: 'caltech', name: 'California Institute of Technology', short: 'Caltech', domains: ['caltech.edu'] },
  { id: 'duke', name: 'Duke University', short: 'Duke', domains: ['duke.edu'] },
  { id: 'jhu', name: 'Johns Hopkins University', short: 'Johns Hopkins', domains: ['jhu.edu', 'jh.edu'] },
  { id: 'northwestern', name: 'Northwestern University', short: 'Northwestern', domains: ['northwestern.edu', 'u.northwestern.edu'] },
  { id: 'upenn', name: 'University of Pennsylvania', short: 'UPenn / Wharton', domains: ['upenn.edu', 'wharton.upenn.edu'] },
  { id: 'cornell', name: 'Cornell University', short: 'Cornell', domains: ['cornell.edu'] },
  { id: 'uchicago', name: 'University of Chicago', short: 'UChicago', domains: ['uchicago.edu', 'chicagobooth.edu'] },
  { id: 'brown', name: 'Brown University', short: 'Brown', domains: ['brown.edu'] },
  { id: 'columbia', name: 'Columbia University', short: 'Columbia', domains: ['columbia.edu', 'barnard.edu'] },
  { id: 'dartmouth', name: 'Dartmouth College', short: 'Dartmouth', domains: ['dartmouth.edu'] },
  { id: 'rice', name: 'Rice University', short: 'Rice', domains: ['rice.edu'] },
  { id: 'vanderbilt', name: 'Vanderbilt University', short: 'Vanderbilt', domains: ['vanderbilt.edu'] },
  { id: 'nd', name: 'University of Notre Dame', short: 'Notre Dame', domains: ['nd.edu'] },
  { id: 'ucla', name: 'University of California, Los Angeles', short: 'UCLA', domains: ['ucla.edu', 'g.ucla.edu'] },
  { id: 'berkeley', name: 'University of California, Berkeley', short: 'Berkeley', domains: ['berkeley.edu'] },
  { id: 'cmu', name: 'Carnegie Mellon University', short: 'Carnegie Mellon', domains: ['andrew.cmu.edu', 'cmu.edu'] },
  { id: 'emory', name: 'Emory University', short: 'Emory', domains: ['emory.edu'] },
  { id: 'georgetown', name: 'Georgetown University', short: 'Georgetown', domains: ['georgetown.edu'] },
  { id: 'umich', name: 'University of Michigan', short: 'Michigan', domains: ['umich.edu'] },
  { id: 'usc', name: 'University of Southern California', short: 'USC', domains: ['usc.edu'] },
];

export type EmailCheckResult =
  | { ok: true; school: School; email: string }
  | { ok: false; reason: 'format' | 'not_edu' | 'not_participating'; message: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function findSchoolByEmail(email: string): School | null {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  if (at < 0) return null;
  const domain = e.slice(at + 1);
  return (
    TOP_25_SCHOOLS.find((s) =>
      s.domains.some((d) => domain === d || domain.endsWith(`.${d}`)),
    ) ?? null
  );
}

export function validateStudentEmail(raw: string): EmailCheckResult {
  const email = normalizeEmail(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'format', message: 'Enter a valid email address.' };
  }
  if (!email.endsWith('.edu') && !email.includes('.edu')) {
    // Allow known non-.edu school domains (e.g. none in our list currently, but keep message clear)
    const school = findSchoolByEmail(email);
    if (!school) {
      return {
        ok: false,
        reason: 'not_edu',
        message: 'Use your university .edu email. Personal Gmail/Outlook addresses aren’t accepted.',
      };
    }
  }
  const school = findSchoolByEmail(email);
  if (!school) {
    return {
      ok: false,
      reason: 'not_participating',
      message: 'That .edu isn’t on our participating Top 25 list yet. Clarvy is invite-only for enrolled students at participating schools.',
    };
  }
  return { ok: true, school, email };
}

export function isParticipatingDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return TOP_25_SCHOOLS.some((s) => s.domains.some((x) => d === x || d.endsWith(`.${x}`)));
}

/** Consumer mailboxes we refuse for firm accounts — firms must use a work domain. */
const FREE_MAIL = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'pm.me',
  'zoho.com', 'gmx.com', 'mail.com', 'yandex.com', 'hey.com', 'fastmail.com',
];

export type FirmEmailCheck =
  | { ok: true; email: string; domain: string }
  | { ok: false; reason: 'format' | 'free_mail' | 'edu'; message: string };

export function validateFirmEmail(raw: string): FirmEmailCheck {
  const email = normalizeEmail(raw);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'format', message: 'Enter a valid work email address.' };
  }
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (FREE_MAIL.includes(domain)) {
    return {
      ok: false,
      reason: 'free_mail',
      message: 'Firm accounts need a company domain. Personal Gmail / Outlook / iCloud addresses aren’t accepted.',
    };
  }
  if (domain.endsWith('.edu')) {
    return {
      ok: false,
      reason: 'edu',
      message: 'That’s a university address. Students should join through the student signup instead.',
    };
  }
  return { ok: true, email, domain };
}

/**
 * Deterministic 6-digit verification code for the demo. In production this is
 * generated server-side and emailed to the .edu address; nothing else can
 * receive it, which is what proves the inbox belongs to an enrolled student.
 */
export function demoVerificationCode(email: string): string {
  let h = 0;
  for (const ch of normalizeEmail(email)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return String(100000 + (h % 900000));
}
