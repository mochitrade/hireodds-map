import React, { useState } from 'react';
import type { Analyst, AnalystExperience, AnalystProject } from './demoStore';
import type { StudentSession } from './session';
import { initialsOf } from './session';

/** Deterministic portrait — no banner. */
export function photoFor(seed: string, explicit?: string | null): string {
  if (explicit && explicit.trim()) return explicit.trim();
  return `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ebeae6,e4ebe8,e8e6f0,f0ebe4`;
}

export function Avatar({
  seed,
  name,
  photoUrl,
  color,
  size = 36,
  className,
}: {
  seed: string;
  name: string;
  photoUrl?: string | null;
  color?: string;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = photoFor(seed, photoUrl);
  return (
    <span
      className={`tb-avatar${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size, background: color || '#1c1c1a', fontSize: Math.max(10, Math.round(size * 0.32)) }}
    >
      {!broken ? (
        <img src={src} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} />
      ) : null}
      <span className="fallback" style={broken ? { opacity: 1 } : undefined} aria-hidden>
        {initialsOf(name)}
      </span>
    </span>
  );
}

/** Known schools / banks / clubs → logo domain + brand color for fallback glyph. */
const ORG_MARKS: { match: RegExp; domain: string; color: string; glyph: string }[] = [
  { match: /wharton|upenn|penn finance/i, domain: 'upenn.edu', color: '#011F5B', glyph: 'W' },
  { match: /harris\s*williams/i, domain: 'harriswilliams.com', color: '#0B2B4A', glyph: 'HW' },
  { match: /evercore/i, domain: 'evercore.com', color: '#1B3A5C', glyph: 'E' },
  { match: /stern|nyu/i, domain: 'stern.nyu.edu', color: '#57068C', glyph: 'S' },
  { match: /moelis/i, domain: 'moelis.com', color: '#0D1B2A', glyph: 'M' },
  { match: /lazard/i, domain: 'lazard.com', color: '#1A1A1A', glyph: 'L' },
  { match: /\blse\b|london school/i, domain: 'lse.ac.uk', color: '#E31C3D', glyph: 'LSE' },
  { match: /rothschild/i, domain: 'rothschildandco.com', color: '#6B1D2A', glyph: 'R' },
  { match: /bain\s*capital/i, domain: 'baincapital.com', color: '#C41230', glyph: 'BC' },
  { match: /harvard|hbs/i, domain: 'harvard.edu', color: '#A51C30', glyph: 'H' },
  { match: /stanford/i, domain: 'stanford.edu', color: '#8C1515', glyph: 'S' },
  { match: /columbia/i, domain: 'columbia.edu', color: '#B9D9EB', glyph: 'C' },
  { match: /yale/i, domain: 'yale.edu', color: '#00356B', glyph: 'Y' },
  { match: /princeton/i, domain: 'princeton.edu', color: '#E77500', glyph: 'P' },
  { match: /mit\b/i, domain: 'mit.edu', color: '#A31F34', glyph: 'MIT' },
  { match: /chicago|booth/i, domain: 'uchicago.edu', color: '#800000', glyph: 'C' },
  { match: /berkeley/i, domain: 'berkeley.edu', color: '#003262', glyph: 'B' },
  { match: /goldman/i, domain: 'goldmansachs.com', color: '#7399C6', glyph: 'GS' },
  { match: /morgan\s*stanley|jpmorgan|j\.?p\.?\s*morgan/i, domain: 'jpmorgan.com', color: '#004B93', glyph: 'JP' },
  { match: /centerview/i, domain: 'centerviewpartners.com', color: '#1C2B3A', glyph: 'CV' },
  { match: /pj?t\b|pj?t partners/i, domain: 'pjtpartners.com', color: '#0A2540', glyph: 'PJT' },
  { match: /meridian/i, domain: '', color: '#1c1c1a', glyph: 'MP' },
];

function markFor(org: string) {
  const hit = ORG_MARKS.find((m) => m.match.test(org));
  if (hit) return hit;
  const glyph = org
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
  return { domain: '', color: '#1c1c1a', glyph: glyph.slice(0, 3) };
}

export function OrgMark({ org, size = 36 }: { org: string; size?: number }) {
  const mark = markFor(org);
  const [broken, setBroken] = useState(!mark.domain);
  // Clearbit → Google favicon → brand glyph
  const sources = mark.domain
    ? [
        `https://logo.clearbit.com/${mark.domain}`,
        `https://www.google.com/s2/favicons?domain=${encodeURIComponent(mark.domain)}&sz=128`,
      ]
    : [];
  const [srcIdx, setSrcIdx] = useState(0);
  const src = !broken && sources[srcIdx] ? sources[srcIdx] : '';

  return (
    <span
      className="tb-orgmark"
      style={{ width: size, height: size, background: mark.color, fontSize: Math.max(9, Math.round(size * 0.28)) }}
      title={org}
    >
      {src ? (
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          onError={() => {
            if (srcIdx + 1 < sources.length) setSrcIdx(srcIdx + 1);
            else setBroken(true);
          }}
        />
      ) : (
        <span aria-hidden>{mark.glyph}</span>
      )}
    </span>
  );
}

export function analystFromStudent(s: StudentSession): Analyst {
  const companies = [
    ...new Set([
      ...s.profile.companies,
      ...s.profile.experience.map((e) => e.org).filter(Boolean),
    ]),
  ];
  return {
    id: 'a-me',
    name: s.name,
    school: s.schoolShort,
    year: s.gradYear,
    focus: s.profile.workstreams[0] || s.major || 'IB scopes',
    score: Math.min(99, 88 + Math.round(s.standing.score / 20)),
    initials: initialsOf(s.name),
    color: '#1e3a6e',
    why: [
      `Verified ${s.schoolShort} ${s.year.toLowerCase()}`,
      s.profile.tools.slice(0, 2).join(' + ') || 'vault-trained',
      s.profile.nextFree || 'available',
    ].join(' · '),
    headline: s.profile.headline || undefined,
    bio: s.profile.bio || undefined,
    major: s.profile.concentration || s.major || undefined,
    location: s.profile.location || undefined,
    linkedIn: s.profile.linkedIn || undefined,
    github: s.profile.github || undefined,
    photoUrl: s.profile.photoUrl || undefined,
    tools: s.profile.tools,
    workstreams: s.profile.workstreams,
    languages: s.profile.languages,
    availability: s.profile.nextFree || undefined,
    standing: s.standing.score,
    engagements: s.standing.engagementsCompleted,
    experience: s.profile.experience.filter((e) => e.title && e.org) as AnalystExperience[],
    projects: s.profile.projects.filter((p) => p.title) as AnalystProject[],
    companies,
  };
}

function hrefOf(raw: string, kind: 'linkedin' | 'github'): string {
  const t = raw.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  if (kind === 'linkedin') {
    const path = t.replace(/^linkedin\.com\/?/i, '').replace(/^\/+/, '');
    return `https://www.linkedin.com/${path.startsWith('in/') ? path : `in/${path}`}`;
  }
  const path = t.replace(/^github\.com\/?/i, '').replace(/^\/+/, '');
  return `https://github.com/${path}`;
}

/** Full-page analyst profile (not a modal) — sits in the main content column. */
export function PersonProfilePage({
  person,
  backLabel = 'Back',
  onBack,
  onMessage,
  onOffer,
  offerLabel,
}: {
  person: Analyst;
  backLabel?: string;
  onBack: () => void;
  onMessage?: () => void;
  onOffer?: () => void;
  offerLabel?: string;
}) {
  const li = person.linkedIn ? hrefOf(person.linkedIn, 'linkedin') : '';
  const gh = person.github ? hrefOf(person.github, 'github') : '';
  const exp = person.experience ?? [];
  const projects = person.projects ?? [];
  const companies = person.companies ?? [];
  const tools = person.tools ?? [];
  const streams = person.workstreams ?? [];
  const schoolMarkOrg = person.school.includes('Wharton') || person.school.includes('UPenn')
    ? 'Wharton'
    : person.school;

  return (
    <div className="tb-person">
      <div className="tb-person-bar">
        <button type="button" className="tb-person-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
            <path d="M10.5 3.5 6 8l4.5 4.5" />
          </svg>
          {backLabel}
        </button>
        <div className="tb-person-bar-actions">
          {onMessage ? (
            <button type="button" className="tb-btn ghost" onClick={onMessage}>Message</button>
          ) : null}
          {onOffer ? (
            <button type="button" className="tb-btn primary" onClick={onOffer}>
              {offerLabel || 'Send offer'}
            </button>
          ) : null}
        </div>
      </div>

      <header className="tb-person-head">
        <Avatar seed={person.id} name={person.name} photoUrl={person.photoUrl} color={person.color} size={72} className="tb-person-photo" />
        <div className="tb-person-id">
          <div className="tb-person-name-row">
            <h1>{person.name}</h1>
            {person.standing != null ? <span className="tb-pill green">Standing {person.standing}</span> : null}
            {person.engagements != null && person.engagements > 0 ? (
              <span className="tb-pill">{person.engagements} reviewed</span>
            ) : (
              <span className="tb-pill">Cleared · vault-trained</span>
            )}
          </div>
          {person.headline ? <p className="tb-person-headline">{person.headline}</p> : null}
          <p className="tb-person-school">
            <OrgMark org={schoolMarkOrg} size={16} />
            <span>
              {person.school} &rsquo;{person.year}
              {person.major ? ` · ${person.major}` : ''}
              {person.location ? ` · ${person.location}` : ''}
            </span>
          </p>
          {(li || gh) ? (
            <div className="tb-person-links">
              {li ? (
                <a href={li} target="_blank" rel="noreferrer"><LiIcon /> LinkedIn</a>
              ) : null}
              {gh ? (
                <a href={gh} target="_blank" rel="noreferrer"><GhIcon /> GitHub</a>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {person.bio ? <p className="tb-person-bio">{person.bio}</p> : null}

      <div className="tb-person-meta">
        <span><em>Match</em> {person.score}%</span>
        <span className="sep" />
        <span><em>Focus</em> {person.focus}</span>
        <span className="sep" />
        <span><em>Graduating</em> Class of &rsquo;{person.year}</span>
        <span className="sep" />
        <span><em>Available</em> {person.availability || 'Open this week'}</span>
      </div>

      {companies.length ? (
        <section className="tb-person-sec">
          <h2>Companies &amp; orgs</h2>
          <div className="tb-person-cos">
            {companies.map((c) => (
              <span key={c} className="tb-person-co">
                <OrgMark org={c} size={22} />
                {c}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      {exp.length ? (
        <section className="tb-person-sec">
          <h2>Experience</h2>
          <ul className="tb-person-exp">
            {exp.map((e, i) => (
              <li key={i}>
                <OrgMark org={e.org} size={40} />
                <div className="body">
                  <div className="top">
                    <strong>{e.title}</strong>
                    {e.when ? <time>{e.when}</time> : null}
                  </div>
                  <div className="org">{e.org}</div>
                  {e.detail ? <p>{e.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {projects.length ? (
        <section className="tb-person-sec">
          <h2>Projects</h2>
          <ul className="tb-person-proj">
            {projects.map((p, i) => (
              <li key={i}>
                <div className="top">
                  <strong>{p.title}</strong>
                  {p.link ? (
                    <a href={/^https?:/i.test(p.link) ? p.link : `https://${p.link}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : null}
                </div>
                {p.detail ? <p>{p.detail}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {(streams.length || tools.length || (person.languages?.length ?? 0) > 0) ? (
        <section className="tb-person-sec">
          <h2>Workstreams &amp; tools</h2>
          <div className="tb-person-chips">
            {streams.map((w) => <span key={w}>{w}</span>)}
            {tools.map((t) => <span key={`t-${t}`}>{t}</span>)}
            {(person.languages ?? []).map((l) => <span key={`l-${l}`} className="mute">{l}</span>)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** @deprecated — use PersonProfilePage */
export const PersonProfileModal = PersonProfilePage;

function LiIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM.5 8.5h4V23h-4V8.5zM8.5 8.5h3.8v2h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V23h-4v-6.6c0-1.57-.03-3.6-2.2-3.6-2.2 0-2.54 1.72-2.54 3.5V23h-4V8.5z" />
    </svg>
  );
}

function GhIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.2 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.1-.75.08-.74.08-.74 1.21.09 1.85 1.25 1.85 1.25 1.08 1.85 2.83 1.32 3.52 1.01.11-.78.42-1.32.77-1.62-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.65.24 2.87.12 3.17.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.22.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}
