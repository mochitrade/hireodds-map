import type { School } from './schools';
import { findSchoolByEmail, normalizeEmail } from './schools';

export type SessionRole = 'student' | 'firm';

export const WORKSTREAMS = [
  'Pitch decks',
  'CIMs / teasers',
  'Comps & precedents',
  'Model audits',
  'Buyer / target screening',
  'Data-room prep',
] as const;

export const TOOLS = [
  'Excel',
  'PowerPoint',
  'Capital IQ',
  'PitchBook',
  'Bloomberg',
  'FactSet',
  'Python',
] as const;

export const TIMEZONES = [
  'ET',
  'CT',
  'MT',
  'PT',
  'UK',
  'EU',
] as const;

export interface StudentExperience {
  title: string;
  org: string;
  detail: string;
  when?: string;
}

export interface StudentProject {
  title: string;
  detail: string;
  link?: string;
}

export interface StudentProfile {
  headline: string;
  bio: string;
  concentration: string;
  gpa: string; // optional display string, e.g. "3.7"
  location: string;
  linkedIn: string;
  github: string;
  /** Optional portrait URL — empty uses a deterministic avatar. No banner. */
  photoUrl: string;
  workstreams: string[];
  tools: string[];
  languages: string[];
  experience: StudentExperience[];
  projects: StudentProject[];
  /** Explicit companies / firms they've worked with (shown on profile) */
  companies: string[];
  hoursPerWeek: string;
  timezone: string;
  nextFree: string; // e.g. "Tonight after 7pm ET"
  payoutMethod: 'ach' | 'wise' | 'paypal' | '';
  /** Soft commitment — student attests they’ll respond to offers within 24h */
  responseCommitment: boolean;
  vaultOrientationAt: string | null;
  profileCompletedAt: string | null;
}

export interface StudentStanding {
  /** 0–100 demo standing used for matching priority */
  score: number;
  engagementsCompleted: number;
  onTimeRate: number; // 0–100
  responseRate: number; // 0–100
  nextReverifyAt: string; // ISO — end of current academic term (demo)
}

export interface StudentSession {
  role: 'student';
  name: string;
  email: string;
  schoolId: string;
  schoolName: string;
  schoolShort: string;
  year: string;
  gradYear: string; // two-digit, e.g. "26"
  major: string;
  verifiedAt: string; // ISO — when the .edu inbox code was confirmed
  profile: StudentProfile;
  standing: StudentStanding;
}

export interface FirmSession {
  role: 'firm';
  name: string;
  email: string;
  firm: string;
  title: string;
  ndaSignedAt: string | null;
}

export type ClarvySession = StudentSession | FirmSession;

const KEY = 'clarvy_session_v1';

export function emptyProfile(): StudentProfile {
  return {
    headline: '',
    bio: '',
    concentration: '',
    gpa: '',
    location: '',
    linkedIn: '',
    github: '',
    photoUrl: '',
    workstreams: [],
    tools: [],
    languages: ['English'],
    experience: [{ title: '', org: '', detail: '' }],
    projects: [],
    companies: [],
    hoursPerWeek: '8–12',
    timezone: 'ET',
    nextFree: '',
    payoutMethod: '',
    responseCommitment: false,
    vaultOrientationAt: null,
    profileCompletedAt: null,
  };
}

export function freshStanding(): StudentStanding {
  // New analysts start mid-standing; grows with reviewed engagements
  const now = new Date();
  const month = now.getMonth();
  // Next re-verify: end of current academic term (Dec or May)
  const reverify = new Date(now.getFullYear(), month < 5 ? 4 : 11, month < 5 ? 15 : 20);
  if (reverify < now) reverify.setFullYear(reverify.getFullYear() + 1);
  return {
    score: 72,
    engagementsCompleted: 0,
    onTimeRate: 100,
    responseRate: 100,
    nextReverifyAt: reverify.toISOString(),
  };
}

export function isProfileComplete(s: ClarvySession | null): boolean {
  return !!(s && s.role === 'student' && s.profile.profileCompletedAt);
}

export function loadSession(): ClarvySession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ClarvySession;
    if (s.role !== 'student' && s.role !== 'firm') return null;
    if (s.role === 'student') {
      // Migrate any partial / older shapes
      s.profile = { ...emptyProfile(), ...(s.profile ?? {}) };
      s.standing = { ...freshStanding(), ...(s.standing ?? {}) };
      if (!Array.isArray(s.profile.experience) || s.profile.experience.length === 0) {
        s.profile.experience = [{ title: '', org: '', detail: '' }];
      }
      if (!Array.isArray(s.profile.projects)) s.profile.projects = [];
      if (!Array.isArray(s.profile.companies)) s.profile.companies = [];
      if (typeof s.profile.github !== 'string') s.profile.github = '';
      if (typeof s.profile.photoUrl !== 'string') s.profile.photoUrl = '';
    }
    return s;
  } catch {
    return null;
  }
}

export function saveSession(s: ClarvySession) {
  sessionStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
}

const YEAR_TO_GRAD: Record<string, number> = {
  Freshman: 4,
  Sophomore: 3,
  Junior: 2,
  Senior: 1,
  'Master’s': 1,
};

export function gradYearFor(year: string): string {
  const now = new Date();
  // Academic year rolls over in June
  const base = now.getMonth() >= 5 ? now.getFullYear() + 1 : now.getFullYear();
  const g = base + (YEAR_TO_GRAD[year] ?? 2) - 1;
  return String(g).slice(-2);
}

export function studentFromForm(input: {
  name: string;
  email: string;
  year: string;
  major: string;
  school: School;
}): StudentSession {
  return {
    role: 'student',
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    schoolId: input.school.id,
    schoolName: input.school.name,
    schoolShort: input.school.short,
    year: input.year,
    gradYear: gradYearFor(input.year),
    major: input.major.trim(),
    verifiedAt: new Date().toISOString(),
    profile: emptyProfile(),
    standing: freshStanding(),
  };
}

export function firmFromForm(input: {
  name: string;
  email: string;
  firm: string;
  title: string;
}): FirmSession {
  return {
    role: 'firm',
    name: input.name.trim(),
    email: normalizeEmail(input.email),
    firm: input.firm.trim(),
    title: input.title.trim(),
    ndaSignedAt: null,
  };
}

/** Login: any address at a participating school resolves to a student session (demo — no password store). */
export function demoLoginStudent(email: string, name?: string): StudentSession | null {
  const school = findSchoolByEmail(email);
  if (!school) return null;
  const local = normalizeEmail(email).split('@')[0];
  const guessed = local
    .split(/[._-]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
  return {
    role: 'student',
    name: name?.trim() || guessed || 'Student',
    email: normalizeEmail(email),
    schoolId: school.id,
    schoolName: school.name,
    schoolShort: school.short,
    year: 'Junior',
    gradYear: gradYearFor('Junior'),
    major: 'Finance',
    verifiedAt: new Date().toISOString(),
    profile: emptyProfile(),
    standing: freshStanding(),
  };
}

/** Fully filled demo student — used by Skip when you want a ready Worker, or seed. */
export function demoCompleteStudent(overrides?: Partial<StudentSession>): StudentSession {
  const base = demoLoginStudent('sofia.chen@wharton.upenn.edu', 'Sofia Chen')!;
  base.year = 'Junior';
  base.gradYear = '26';
  base.major = 'Finance';
  base.profile = {
    headline: 'Wharton junior · M&A decks and comps',
    bio: 'Prior sell-side pitch decks and comps sets through Wharton Finance Club. Looking for overnight deck turns and same-day comps refreshes.',
    concentration: 'Finance',
    gpa: '3.8',
    location: 'Philadelphia, PA',
    linkedIn: 'linkedin.com/in/sofiachen',
    github: 'github.com/sofiachen',
    photoUrl: '',
    workstreams: ['Pitch decks', 'Comps & precedents', 'CIMs / teasers'],
    tools: ['Excel', 'PowerPoint', 'Capital IQ', 'PitchBook'],
    languages: ['English', 'Mandarin'],
    experience: [
      {
        title: 'Analyst',
        org: 'Wharton Finance Club',
        when: '2024–present',
        detail: 'Led comps pages on two sell-side mock processes; rebuilt a 40-slide deck overnight.',
      },
      {
        title: 'Summer analyst',
        org: 'Harris Williams',
        when: 'Summer 2025',
        detail: 'CIM drafting and buyer screening for a middle-market industrials process.',
      },
    ],
    projects: [
      {
        title: 'LBO case — consumer roll-up',
        detail: 'Full LBO + sensitivity pack for a club case competition.',
        link: 'github.com/sofiachen/lbo-rollup',
      },
    ],
    companies: ['Wharton Finance Club', 'Harris Williams', 'Evercore'],
    hoursPerWeek: '10–15',
    timezone: 'ET',
    nextFree: 'Tonight after 8pm ET',
    payoutMethod: 'ach',
    responseCommitment: true,
    vaultOrientationAt: new Date().toISOString(),
    profileCompletedAt: new Date().toISOString(),
  };
  base.standing = {
    score: 94,
    engagementsCompleted: 7,
    onTimeRate: 100,
    responseRate: 98,
    nextReverifyAt: freshStanding().nextReverifyAt,
  };
  return { ...base, ...overrides, profile: { ...base.profile, ...(overrides?.profile ?? {}) } };
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function profileFocusLine(s: StudentSession): string {
  const ws = s.profile.workstreams[0] ?? s.major ?? 'IB scopes';
  return `${s.major || 'Finance'} · ${ws}`;
}

export function profileWhyLine(s: StudentSession): string {
  const bits: string[] = [];
  bits.push(`Verified ${s.schoolShort} ${s.year.toLowerCase()}`);
  if (s.profile.tools.length) bits.push(s.profile.tools.slice(0, 2).join(' + '));
  if (s.profile.nextFree) bits.push(s.profile.nextFree);
  else bits.push('vault-trained');
  if (s.standing.engagementsCompleted > 0) {
    bits.push(`${s.standing.engagementsCompleted} reviewed`);
  } else {
    bits.push('cleared NDA');
  }
  return bits.join(' · ');
}
