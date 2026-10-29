import React, { useState } from 'react';
import {
  Analyst,
  BENCH,
  DELIVERABLE_STATUS_LABEL,
  DemoActions,
  DemoState,
  FileKind,
  RoleMode,
  TalentFirm,
  deliverableDue,
  deliverableProgress,
  selectedAnalyst,
} from './demoStore';
import { DeadlinesPanel, MessagesPanel } from './ChatAndDeadlines';
import { Avatar, OrgMark } from './PersonProfile';

export function RoleToggle({ role, onRoleChange }: { role: RoleMode; onRoleChange: (r: RoleMode) => void }) {
  return (
    <div className="tb-role-toggle" role="group" aria-label="Switch view">
      <button type="button" className={role === 'company' ? 'active' : ''} onClick={() => onRoleChange('company')}>Company</button>
      <button type="button" className={role === 'worker' ? 'active' : ''} onClick={() => onRoleChange('worker')}>Worker</button>
    </div>
  );
}

export type NavId =
  | 'home'
  | 'rooms'
  | 'search'
  | 'bench'
  | 'messages'
  | 'saved'
  | 'deadlines'
  | 'vault'
  | 'profile';

/** Signed-in identity shown in the shell (from the marketing-site session). */
export interface ShellUser {
  name: string;
  email: string;
  /** e.g. "Wharton ’26" or "Meridian Partners" */
  orgLabel: string;
  kind: 'student' | 'firm';
  verifiedLabel: string; // e.g. ".edu verified · University of Pennsylvania"
  initials: string;
  /** Firm mark or student headshot */
  avatarUrl?: string;
}

const paths: Record<string, React.ReactNode> = {
  home: <path d="M3 7.5 8 3l5 4.5V13a.8.8 0 0 1-.8.8H9.8V9.6H6.2v4.2H3.8A.8.8 0 0 1 3 13V7.5Z" />,
  rooms: <><rect x="2.5" y="4.5" width="11" height="8.5" rx="1.2" /><path d="M5.8 4.5V3.2A1.2 1.2 0 0 1 7 2h2a1.2 1.2 0 0 1 1.2 1.2v1.3" /></>,
  bench: <><circle cx="5.5" cy="6" r="2.2" /><path d="M1.8 13c.4-2.2 1.9-3.4 3.7-3.4S8.8 10.8 9.2 13" /><circle cx="11" cy="5.4" r="1.8" /><path d="M10 9.2c2 0 3.5 1.1 3.9 3.1" /></>,
  chat: <path d="M2.5 3.8h11v7h-6.2L4.5 13.4v-2.6h-2v-7Z" />,
  saved: <path d="M4.5 2.5h7V13.5L8 10.8 4.5 13.5V2.5Z" />,
  calendar: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.2" /><path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" /></>,
  vault: <><rect x="2.5" y="4.5" width="11" height="9" rx="1.4" /><circle cx="8" cy="9" r="2" /><path d="M8 7V5.8M5.5 4.5V3h5v1.5" /></>,
  live: <><circle cx="8" cy="8" r="2" /><path d="M4.5 4.5a5 5 0 0 0 0 7M11.5 4.5a5 5 0 0 1 0 7" /></>,
  queue: <path d="M2.5 4h11M2.5 8h11M2.5 12h7" />,
  notes: <><path d="M4 2.5h8v11H4z" /><path d="M6 5.5h4M6 8h4M6 10.5h2.5" /></>,
  help: <><circle cx="8" cy="8" r="5.5" /><path d="M6.4 6.4A1.7 1.7 0 0 1 9.7 7c0 1.1-1.7 1.3-1.7 2.3M8 11.4v.1" /></>,
  profile: <><circle cx="8" cy="5.6" r="2.4" /><path d="M3.4 13.4c.6-2.6 2.4-4 4.6-4s4 1.4 4.6 4" /></>,
  collapse: <><rect x="2.5" y="3" width="11" height="10" rx="1.2" /><path d="M6.5 3v10M11 6.5 9.2 8l1.8 1.5" /></>,
  search: <><circle cx="7" cy="7" r="4" /><path d="m10.2 10.2 3 3" /></>,
  doc: <><path d="M4.5 2.5h5L12 5v8.5h-7.5v-11Z" /><path d="M9.5 2.5V5H12" /></>,
  lock: <><rect x="4" y="7" width="8" height="6" rx="1.2" /><path d="M5.8 7V5.4a2.2 2.2 0 0 1 4.4 0V7" /></>,
  check: <path d="m3.5 8.5 3 3 6-7" />,
  close: <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />,
  shield: <path d="M8 2.2 13 4v4.1c0 3-2.1 5-5 5.9-2.9-.9-5-2.9-5-5.9V4l5-1.8Z" />,
  plus: <path d="M8 3.5v9M3.5 8h9" />,
  eye: <><path d="M1.8 8S4 4.4 8 4.4 14.2 8 14.2 8 12 11.6 8 11.6 1.8 8 1.8 8Z" /><circle cx="8" cy="8" r="1.8" /></>,
  arrowR: <path d="M3 8h9M9 4.5 12.5 8 9 11.5" />,
  play: <path d="M6 4.3 11 8l-5 3.7V4.3Z" />,
};

export function KindBadge({ kind }: { kind: FileKind }) {
  return <span className={`tb-kind tb-kind-${kind}`}>{kind === 'memo' ? 'MEMO' : kind.toUpperCase()}</span>;
}

export function Ic({ name, size = 15 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

const COMPANY_NAV: { id: NavId; icon: string; label: string }[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'rooms', icon: 'rooms', label: 'Deal rooms' },
  { id: 'search', icon: 'search', label: 'Search' },
  { id: 'bench', icon: 'bench', label: 'Talent bench' },
  { id: 'messages', icon: 'chat', label: 'Messages' },
  { id: 'saved', icon: 'saved', label: 'Saved' },
  { id: 'deadlines', icon: 'calendar', label: 'Deadlines' },
  { id: 'vault', icon: 'vault', label: 'Vault' },
];

const WORKER_NAV: { id: NavId; icon: string; label: string }[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'rooms', icon: 'queue', label: 'My queue' },
  { id: 'search', icon: 'search', label: 'Search' },
  { id: 'bench', icon: 'rooms', label: 'Active sessions' },
  { id: 'messages', icon: 'chat', label: 'Messages' },
  { id: 'saved', icon: 'saved', label: 'Saved' },
  { id: 'deadlines', icon: 'calendar', label: 'Deadlines' },
  { id: 'vault', icon: 'vault', label: 'Secure vault' },
];

export function AppSidebar({
  role,
  onRoleChange,
  nav,
  onNav,
  onReset,
  liveCount,
  user,
  onHelp,
  onLogout,
  onSite,
}: {
  role: RoleMode;
  onRoleChange: (r: RoleMode) => void;
  nav: NavId;
  onNav: (id: NavId) => void;
  onReset: () => void;
  liveCount?: number;
  user?: ShellUser;
  onHelp?: () => void;
  onLogout?: () => void;
  onSite?: () => void;
}) {
  const items = role === 'company' ? COMPANY_NAV : WORKER_NAV;
  return (
    <aside className="tb-side">
      <RoleToggle role={role} onRoleChange={onRoleChange} />
      <button type="button" className="tb-brand tb-brand-link" onClick={onSite} title="Back to clarvy.com">
        CLARVY
      </button>

      <button className="tb-quick" type="button" onClick={() => onNav('search')}>
        <span>Quick access</span>
        <span className="kbd">⌘K</span>
      </button>

      <div className="tb-nav-group">
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            className={`tb-nav-item tb-nav-item--text${nav === n.id ? ' active' : ''}`}
            onClick={() => onNav(n.id)}
          >
            {n.label}
            {n.id === 'messages' ? <span className="badge">2</span> : null}
          </button>
        ))}
      </div>

      <div className="tb-side-spacer" />
      <div className="tb-side-divider" />

      <div className="tb-nav-group">
        <button type="button" className="tb-nav-item tb-nav-item--text" onClick={() => onNav('rooms')}>
          Live sessions
          {liveCount ? <span className="badge">{liveCount}</span> : null}
        </button>
        <button type="button" className="tb-nav-item tb-nav-item--text" onClick={() => onNav(role === 'company' ? 'rooms' : 'rooms')}>
          {role === 'company' ? 'Request queue' : 'My offers'}
        </button>
        <button type="button" className="tb-nav-item tb-nav-item--text" onClick={onReset}>
          Reset demo
        </button>
        <button type="button" className="tb-nav-item tb-nav-item--text" onClick={onHelp}>
          Help & support
        </button>
      </div>

      {user ? (
        <button
          type="button"
          className={`tb-user${nav === 'profile' ? ' active' : ''}`}
          onClick={() => onNav('profile')}
          title="Profile"
        >
          {user.avatarUrl ? (
            <img className="tb-user-avatar tb-user-avatar--img" src={user.avatarUrl} alt="" />
          ) : (
            <span className="tb-user-avatar">{user.initials}</span>
          )}
          <span className="tb-user-meta">
            <span className="tb-user-name">{user.name}</span>
            <span className="tb-user-org">{user.orgLabel}</span>
          </span>
          <Ic name="arrowR" size={12} />
        </button>
      ) : (
        <button type="button" className="tb-nav-item tb-nav-item--text" onClick={() => onNav('profile')}>
          Profile
        </button>
      )}
      {onLogout ? (
        <button type="button" className="tb-logout" onClick={onLogout}>Log out</button>
      ) : null}
    </aside>
  );
}

/* ---------- profile panel (shared) ---------- */

export function ProfilePanel({
  user,
  role,
  ndaSignedAt,
  student,
  onLogout,
  onSite,
  onEditProfile,
}: {
  user: ShellUser;
  role: RoleMode;
  ndaSignedAt: string | null;
  student?: import('./session').StudentSession | null;
  onLogout: () => void;
  onSite: () => void;
  onEditProfile?: () => void;
}) {
  const nda = ndaSignedAt ? new Date(ndaSignedAt) : null;
  const p = student?.profile;
  const st = student?.standing;
  const reverify = st ? new Date(st.nextReverifyAt) : null;
  const companies = student
    ? [...new Set([...(p?.companies ?? []), ...(p?.experience.map((e) => e.org).filter(Boolean) ?? [])])]
    : [];

  return (
    <PanelShell
      title="Profile"
      sub={user.kind === 'student' ? 'What firms see when they click you — photo, links, experience, projects.' : 'Your firm account, NDA status and Vault policy.'}
      action={
        <div style={{ display: 'flex', gap: 8 }}>
          {user.kind === 'student' && onEditProfile ? (
            <button type="button" className="tb-btn ghost" onClick={onEditProfile}>Edit profile</button>
          ) : null}
          <button type="button" className="tb-btn ghost" onClick={onLogout}>Log out</button>
        </div>
      }
    >
      <div className="tb-profile">
        <div className="tb-profile-card">
          {student ? (
            <Avatar seed={student.email} name={user.name} photoUrl={p?.photoUrl} size={56} className="tb-profile-avatar-img" />
          ) : (
            <span className="tb-profile-avatar">{user.initials}</span>
          )}
          <div className="tb-profile-id">
            <strong>{user.name}</strong>
            {p?.headline ? <span className="tb-profile-headline">{p.headline}</span> : null}
            <span>{user.email}</span>
            <span className="tb-pill green"><Ic name="check" size={11} /> {user.verifiedLabel}</span>
            {(p?.linkedIn || p?.github) ? (
              <div className="tb-profile-ext">
                {p.linkedIn ? <a href={p.linkedIn.startsWith('http') ? p.linkedIn : `https://${p.linkedIn}`} target="_blank" rel="noreferrer">LinkedIn</a> : null}
                {p.github ? <a href={p.github.startsWith('http') ? p.github : `https://${p.github}`} target="_blank" rel="noreferrer">GitHub</a> : null}
              </div>
            ) : null}
          </div>
        </div>

        {student && p ? (
          <>
            <div className="tb-profile-grid">
              <div className="tb-profile-stat">
                <span>School · graduating</span>
                <strong>{student.schoolShort} ’{student.gradYear} · {p.concentration || student.major || 'Finance'}</strong>
              </div>
              <div className="tb-profile-stat">
                <span>Standing</span>
                <strong>{st?.score ?? '—'} · {st?.engagementsCompleted ?? 0} reviewed</strong>
              </div>
              <div className="tb-profile-stat">
                <span>Availability</span>
                <strong>{p.hoursPerWeek}/wk · {p.timezone}{p.nextFree ? ` · ${p.nextFree}` : ''}</strong>
              </div>
              <div className="tb-profile-stat">
                <span>Next .edu re-verify</span>
                <strong>
                  {reverify
                    ? reverify.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                    : '—'}
                </strong>
              </div>
            </div>

            {p.bio ? <div className="tb-profile-note">{p.bio}</div> : null}

            {companies.length ? (
              <div className="tb-profile-block">
                <div className="tb-profile-block-label">Companies &amp; orgs</div>
                <div className="tb-person-cos">
                  {companies.map((c) => (
                    <span key={c} className="tb-person-co"><OrgMark org={c} size={20} />{c}</span>
                  ))}
                </div>
              </div>
            ) : null}

            {p.workstreams.length ? (
              <div className="tb-profile-block">
                <div className="tb-profile-block-label">Workstreams</div>
                <div className="tb-profile-chips">
                  {p.workstreams.map((w) => <span key={w}>{w}</span>)}
                </div>
              </div>
            ) : null}

            {p.tools.length ? (
              <div className="tb-profile-block">
                <div className="tb-profile-block-label">Tools</div>
                <div className="tb-profile-chips">
                  {p.tools.map((t) => <span key={t}>{t}</span>)}
                </div>
              </div>
            ) : null}

            {p.experience.filter((e) => e.title).length ? (
              <div className="tb-profile-block">
                <div className="tb-profile-block-label">Experience</div>
                <ul className="tb-person-exp">
                  {p.experience.filter((e) => e.title).map((e, i) => (
                    <li key={i}>
                      <OrgMark org={e.org} size={36} />
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
              </div>
            ) : null}

            {p.projects.filter((x) => x.title).length ? (
              <div className="tb-profile-block">
                <div className="tb-profile-block-label">Projects</div>
                <ul className="tb-profile-exp">
                  {p.projects.filter((x) => x.title).map((proj, i) => (
                    <li key={i}>
                      <strong>{proj.title}</strong>
                      {proj.link ? <> · <a href={proj.link.startsWith('http') ? proj.link : `https://${proj.link}`} target="_blank" rel="noreferrer">Open</a></> : null}
                      {proj.detail ? <span>{proj.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="tb-profile-block">
              <div className="tb-profile-block-label">Why you don’t ditch</div>
              <ul className="tb-profile-retain">
                <li>
                  <strong>Standing {st?.score ?? 0}</strong>
                  <span>Response rate {st?.responseRate ?? 100}% · on-time {st?.onTimeRate ?? 100}%. Ghosting offers drops match priority.</span>
                </li>
                <li>
                  <strong>Track record stays here</strong>
                  <span>Reviewed engagements are the portfolio banks trust. Leave and you restart cold somewhere they don’t.</span>
                </li>
                <li>
                  <strong>Term .edu lock</strong>
                  <span>Re-verified each term. Drop enrollment and matching freezes — alumni keep the record, not the bench.</span>
                </li>
                <li>
                  <strong>Paid after review</strong>
                  <span>Payout via {p.payoutMethod ? p.payoutMethod.toUpperCase() : 'your method'} after the firm closes. Income compounds with standing.</span>
                </li>
              </ul>
            </div>
          </>
        ) : (
          <div className="tb-profile-grid">
            <div className="tb-profile-stat">
              <span>Firm</span>
              <strong>{user.orgLabel}</strong>
            </div>
            <div className="tb-profile-stat">
              <span>Vault NDA</span>
              <strong>
                {nda ? `Signed ${nda.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : 'Signed at onboarding'}
              </strong>
            </div>
            <div className="tb-profile-stat">
              <span>Viewing as</span>
              <strong>{role === 'company' ? 'Company' : 'Worker'}</strong>
            </div>
            <div className="tb-profile-stat">
              <span>Model policy</span>
              <strong>No-Train Lock · private endpoints</strong>
            </div>
          </div>
        )}

        <div className="tb-profile-actions">
          <button type="button" className="tb-btn ghost" onClick={onSite}>Back to website</button>
          {user.kind === 'student' && onEditProfile ? (
            <button type="button" className="tb-btn primary" onClick={onEditProfile}>Edit profile</button>
          ) : (
            <button type="button" className="tb-btn ghost" onClick={onLogout}>Log out</button>
          )}
        </div>
      </div>
    </PanelShell>
  );
}

/* ---------- panel shells used by both dashboards ---------- */

export function PanelShell({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="tb-panel">
      <div className="tb-panel-head">
        <div>
          <h2>{title}</h2>
          {sub ? <p>{sub}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function RowCard({
  tile,
  color,
  title,
  sub,
  right,
  onClick,
  note,
}: {
  tile: string;
  color: string;
  title: string;
  sub: string;
  right?: React.ReactNode;
  onClick?: () => void;
  note?: string;
}) {
  if (onClick) {
    return (
      <button type="button" className="tb-row-card" onClick={onClick}>
        <span className="tb-tile" style={{ background: color }}>{tile}</span>
        <span className="meta">
          <span className="name">{title}</span>
          <span className="sub">{sub}</span>
          {note ? <span className="note">{note}</span> : null}
        </span>
        {right}
      </button>
    );
  }
  return (
    <div className="tb-row-card">
      <span className="tb-tile" style={{ background: color }}>{tile}</span>
      <span className="meta">
        <span className="name">{title}</span>
        <span className="sub">{sub}</span>
        {note ? <span className="note">{note}</span> : null}
      </span>
      {right}
    </div>
  );
}

export function CompanyNavPanels({
  nav,
  demo,
  firm,
  actions,
  onGoHome,
  onOpenVault,
  onNewRequest,
  onSelectAnalyst,
  onOpenPerson,
}: {
  nav: NavId;
  demo: DemoState;
  firm: TalentFirm;
  actions: DemoActions;
  onGoHome: () => void;
  onOpenVault: (deliverableId?: string) => void;
  onNewRequest: () => void;
  onSelectAnalyst: (id: string) => void;
  onOpenPerson: (a: Analyst) => void;
}) {
  const [q, setQ] = useState('');
  const progress = deliverableProgress(demo.job);
  const [saved, setSaved] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('clarvy.saved') || '[]'); } catch { return []; }
  });

  const job = demo.job;
  const analyst = selectedAnalyst(job);
  const connected = !!(job && (job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed'));

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem('clarvy.saved', JSON.stringify(next));
      return next;
    });
  }

  if (nav === 'rooms') {
    return (
      <PanelShell
        title="Deal rooms"
        sub="One room per engagement — brief, vault files, and the connected analyst."
        action={<button type="button" className="tb-btn primary" onClick={onNewRequest}>+ New request</button>}
      >
        {!job ? (
          <div className="tb-empty">
            <div className="tb-empty-icon"><Ic name="rooms" size={20} /></div>
            <h3>No deal rooms yet</h3>
            <p>Create a request to open a room. Matching, offers, and vault work all live here.</p>
            <button type="button" className="tb-btn primary" onClick={onNewRequest}>+ New request</button>
          </div>
        ) : (
          <div className="tb-room-card">
            <div className="tb-room-top">
              <span className="tb-tile" style={{ background: job.color }}>{job.tile}</span>
              <div className="meta">
                <div className="name">{job.name}</div>
                <div className="sub">{job.workstream}{job.fileName ? ` · ${job.fileName}` : ''}</div>
              </div>
              <span className={`tb-pill ${job.status === 'submitted' || job.status === 'reviewed' ? 'green' : 'amber'}`}>
                {job.status.replace('_', ' ')}
              </span>
            </div>
            <div className="tb-room-meta">
              {analyst
                ? <>Connected · <strong>{analyst.name}</strong> · {analyst.school} &rsquo;{analyst.year}</>
                : 'Awaiting analyst connection'}
              {' · '}{progress.approved}/{progress.total} deliverables approved · {job.files.length} files in Vault
            </div>
            <div className="tb-room-actions">
              <button type="button" className="tb-btn ghost" onClick={onGoHome}>Open room</button>
              {(job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed') ? (
                <button type="button" className="tb-btn primary" onClick={() => onOpenVault()}>Open Vault workspace</button>
              ) : demo.step === 'matching' ? (
                <button type="button" className="tb-btn primary" onClick={onGoHome}>Pick analyst</button>
              ) : (
                <button type="button" className="tb-btn primary" onClick={onGoHome}>View status</button>
              )}
            </div>
          </div>
        )}
      </PanelShell>
    );
  }

  if (nav === 'search') {
    const hay = [
      ...(job ? [{ id: 'job', tile: job.tile, color: job.color, title: job.name, sub: job.workstream }] : []),
      ...BENCH.map((a) => ({ id: a.id, tile: a.initials, color: a.color, title: a.name, sub: `${a.school} · ${a.focus}` })),
      ...demo.companyFeed.map((f) => ({ id: f.id, tile: f.tile, color: f.color, title: f.name, sub: f.sub })),
    ].filter((x) => !q || `${x.title} ${x.sub}`.toLowerCase().includes(q.toLowerCase()));

    return (
      <PanelShell title="Search" sub="Find engagements, analysts, and activity across the Vault.">
        <div className="tb-search-box">
          <Ic name="search" size={14} />
          <input autoFocus placeholder="Search projects, analysts, files…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tb-stack">
          {hay.length === 0 ? (
            <div className="tb-empty compact"><p>No results for “{q}”.</p></div>
          ) : hay.map((x) => (
            <RowCard key={x.id} tile={x.tile} color={x.color} title={x.title} sub={x.sub} onClick={onGoHome} />
          ))}
        </div>
      </PanelShell>
    );
  }

  if (nav === 'bench') {
    const list = job?.matches?.length ? job.matches : BENCH;
    return (
      <PanelShell title="Talent bench" sub="Cleared finance students available for staffing. Click anyone for the full profile.">
        <div className="tb-stack">
          {list.map((a) => (
            <div className="tb-match-card" key={a.id}>
              <button type="button" className="tb-match-hit" onClick={() => onOpenPerson(a)}>
                <Avatar seed={a.id} name={a.name} photoUrl={a.photoUrl} color={a.color} size={40} />
                <div className="meta">
                  <div className="name">{a.name}</div>
                  <div className="sub">{a.school} &rsquo;{a.year} · {a.focus} · {a.score}% typical match</div>
                  <div className="why">{a.why}</div>
                </div>
              </button>
              {demo.step === 'matching' && job ? (
                <button type="button" className="tb-btn primary" onClick={() => onSelectAnalyst(a.id)}>Send offer</button>
              ) : (
                <button type="button" className="tb-btn ghost" onClick={() => { toggleSave(a.id); }}>
                  {saved.includes(a.id) ? 'Saved' : 'Save'}
                </button>
              )}
            </div>
          ))}
        </div>
      </PanelShell>
    );
  }

  if (nav === 'messages') {
    return (
      <MessagesPanel
        role="company"
        connected={connected}
        firm={firm}
        analyst={analyst}
        jobName={job?.name}
        meName={firm.contact}
        meSeed={firm.email}
        onOpenProfile={onOpenPerson}
      />
    );
  }

  if (nav === 'saved') {
    const items = [
      ...BENCH.filter((a) => saved.includes(a.id)).map((a) => ({ id: a.id, tile: a.initials, color: a.color, title: a.name, sub: 'Saved analyst' })),
      ...demo.companyFeed.filter((f) => saved.includes(f.id)).map((f) => ({ id: f.id, tile: f.tile, color: f.color, title: f.name, sub: f.sub })),
    ];
    return (
      <PanelShell title="Saved" sub="Bookmarked analysts and activity.">
        {items.length === 0 ? (
          <div className="tb-empty compact"><p>Nothing saved yet. Save analysts from Talent bench or pin feed items from Home.</p></div>
        ) : (
          <div className="tb-stack">
            {items.map((x) => (
              <RowCard key={x.id} tile={x.tile} color={x.color} title={x.title} sub={x.sub}
                right={<button type="button" className="tb-btn ghost" onClick={() => toggleSave(x.id)}>Remove</button>} />
            ))}
          </div>
        )}
        {demo.companyFeed[0] ? (
          <button type="button" className="tb-btn ghost" style={{ marginTop: 12 }} onClick={() => toggleSave(demo.companyFeed[0].id)}>
            Save latest activity item
          </button>
        ) : null}
      </PanelShell>
    );
  }

  if (nav === 'deadlines') {
    return (
      <DeadlinesPanel
        job={job}
        emptyCopy="No deadlines yet. They appear when you create a request."
        onOpen={connected ? (id) => onOpenVault(id) : undefined}
      />
    );
  }

  if (nav === 'vault') {
    const openable = !!job && (job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed');
    return (
      <PanelShell
        title="Vault"
        sub="Engagement-scoped files, deliverables, and audit log. Private APIs · never used to train public models."
        action={openable ? <button type="button" className="tb-btn primary" onClick={() => onOpenVault()}>Open workspace</button> : undefined}
      >
        {!job ? (
          <div className="tb-empty">
            <div className="tb-empty-icon"><Ic name="vault" size={20} /></div>
            <h3>Vault is empty</h3>
            <p>Files and deliverables appear after you create a request. Analysts only see them after accepting an offer.</p>
            <button type="button" className="tb-btn primary" onClick={onNewRequest}>New request</button>
          </div>
        ) : (
          <VaultSummary job={job} openable={openable} onOpenVault={onOpenVault} lockedNote={job.status === 'offered' ? 'Locked until the analyst accepts.' : job.status === 'matching' ? 'Locked · pick an analyst to send an offer.' : null} />
        )}
      </PanelShell>
    );
  }

  return null;
}

export function WorkerNavPanels({
  nav,
  demo,
  firm,
  actions,
  onGoHome,
  onOpenVault,
}: {
  nav: NavId;
  demo: DemoState;
  firm: TalentFirm;
  actions: DemoActions;
  onGoHome: () => void;
  onOpenVault: (deliverableId?: string) => void;
}) {
  const [q, setQ] = useState('');
  const progress = deliverableProgress(demo.job);
  const job = demo.job;
  const analyst = selectedAnalyst(job);
  const connected = !!(job && (job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed'));

  if (nav === 'rooms') {
    return (
      <PanelShell title="My queue" sub="Offers and active engagements assigned to you.">
        {!job || demo.step === 'matching' || demo.step === 'empty' ? (
          <div className="tb-empty">
            <h3>Queue is empty</h3>
            <p>When a firm selects you from the matched bench, the offer shows up here.</p>
            <button type="button" className="tb-btn primary" onClick={onGoHome}>Back to Home</button>
          </div>
        ) : (
          <div className="tb-stack">
            <RowCard
              tile={job.tile}
              color={job.color}
              title={job.name}
              sub={`${firm.firmName} · ${job.status.replace('_', ' ')}`}
              note={job.workstream}
              right={<span className={`tb-pill ${job.status === 'offered' ? 'amber' : 'green'}`}>{job.status === 'offered' ? 'Offer' : job.status}</span>}
              onClick={onGoHome}
            />
            {job.status === 'offered' ? (
              <button type="button" className="tb-btn primary" onClick={() => actions.acceptOffer()}>Accept &amp; unlock Vault</button>
            ) : connected ? (
              <button type="button" className="tb-btn primary" onClick={() => onOpenVault()}>Open Vault workspace</button>
            ) : null}
          </div>
        )}
      </PanelShell>
    );
  }

  if (nav === 'search') {
    const hay = [
      ...(job ? [{ id: 'j', tile: job.tile, color: job.color, title: job.name, sub: firm.firmName }] : []),
      ...demo.workerFeed.map((f) => ({ id: f.id, tile: f.tile, color: f.color, title: f.name, sub: f.sub })),
    ].filter((x) => !q || `${x.title} ${x.sub}`.toLowerCase().includes(q.toLowerCase()));
    return (
      <PanelShell title="Search" sub="Find offers, engagements, and activity.">
        <div className="tb-search-box">
          <Ic name="search" size={14} />
          <input autoFocus placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="tb-stack">
          {hay.length === 0 ? <div className="tb-empty compact"><p>No results.</p></div> : hay.map((x) => (
            <RowCard key={x.id} tile={x.tile} color={x.color} title={x.title} sub={x.sub} onClick={onGoHome} />
          ))}
        </div>
      </PanelShell>
    );
  }

  if (nav === 'bench') {
    return (
      <PanelShell title="Active sessions" sub="Secure workspaces you’re currently staffed on.">
        {connected && job ? (
          <div className="tb-stack">
            <RowCard
              tile={job.tile}
              color={job.color}
              title={job.name}
              sub={`${firm.firmName} · ${progress.approved}/${progress.total} approved · ${job.files.length} files`}
              right={<button type="button" className="tb-btn primary" onClick={() => onOpenVault()}>Open</button>}
            />
          </div>
        ) : (
          <div className="tb-empty compact"><p>No live sessions. Accept an offer to open a secure workspace.</p></div>
        )}
      </PanelShell>
    );
  }

  if (nav === 'messages') {
    return (
      <MessagesPanel
        role="worker"
        connected={connected}
        firm={firm}
        analyst={analyst}
        jobName={job?.name}
        meName={analyst?.name ?? 'You'}
        meSeed={analyst?.id ?? 'worker'}
        mePhoto={analyst?.photoUrl}
      />
    );
  }

  if (nav === 'saved') {
    return (
      <PanelShell title="Saved" sub="Pinned briefs and engagement notes.">
        {demo.workerFeed.length === 0 ? (
          <div className="tb-empty compact"><p>Nothing saved. Activity you pin from Home will show here.</p></div>
        ) : (
          <div className="tb-stack">
            {demo.workerFeed.slice(0, 3).map((f) => (
              <RowCard key={f.id} tile={f.tile} color={f.color} title={f.name} sub={f.sub} note={f.note} />
            ))}
          </div>
        )}
      </PanelShell>
    );
  }

  if (nav === 'deadlines') {
    const show = job && demo.step !== 'empty' && demo.step !== 'matching';
    return (
      <DeadlinesPanel
        job={show ? job : null}
        firmName={firm.firmName}
        locked={job?.status === 'offered'}
        emptyCopy="No deadlines yet."
        onOpen={connected ? (id) => onOpenVault(id) : undefined}
      />
    );
  }

  if (nav === 'vault') {
    return (
      <PanelShell
        title="Secure vault"
        sub="Engagement files and your deliverables — download and copy disabled."
        action={connected ? <button type="button" className="tb-btn primary" onClick={() => onOpenVault()}>Open workspace</button> : undefined}
      >
        {!connected || !job ? (
          <div className="tb-empty">
            <div className="tb-empty-icon"><Ic name="lock" size={20} /></div>
            <h3>Vault locked</h3>
            <p>Accept a firm offer to unlock engagement materials inside the secure interface.</p>
          </div>
        ) : (
          <VaultSummary job={job} openable onOpenVault={onOpenVault} lockedNote={null} />
        )}
      </PanelShell>
    );
  }

  return null;
}

/* ---------- Vault summary (nav panel, both roles) ---------- */

function VaultSummary({
  job,
  openable,
  onOpenVault,
  lockedNote,
}: {
  job: NonNullable<DemoState['job']>;
  openable: boolean;
  onOpenVault: (deliverableId?: string) => void;
  lockedNote: string | null;
}) {
  const progress = deliverableProgress(job);
  const folders: { id: 'firm' | 'working' | 'deliverable'; label: string }[] = [
    { id: 'firm', label: 'Firm materials' },
    { id: 'working', label: 'Working files' },
    { id: 'deliverable', label: 'Submitted deliverables' },
  ];
  return (
    <div className="tb-vault-summary">
      {lockedNote ? (
        <div className="tb-form-note" style={{ margin: 0 }}>
          <Ic name="lock" size={14} />
          <span>{lockedNote}</span>
        </div>
      ) : null}

      <div className="tb-vault-summary-grid">
        {folders.map((f) => {
          const files = job.files.filter((x) => x.folder === f.id);
          return (
            <div className="tb-vault-folder" key={f.id}>
              <div className="hd"><Ic name="rooms" size={13} /> {f.label} <span className="cnt">{files.length}</span></div>
              {files.length === 0 ? <div className="tb-vault-empty">Empty</div> : files.slice(-4).map((x) => (
                <div className="tb-vault-file" key={x.id}>
                  <KindBadge kind={x.kind} />
                  <span className="nm">{x.name}</span>
                  <span className="sb">v{x.version}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div className="tb-section-head" style={{ marginTop: 6 }}>
        <h2 style={{ fontSize: 14 }}>Deliverables · {progress.approved}/{progress.total} approved</h2>
      </div>
      <div className="tb-deliv-list">
        {job.deliverables.map((d) => (
          <button
            key={d.id}
            type="button"
            className={`tb-deliv-item${openable ? '' : ' muted'}`}
            disabled={!openable}
            onClick={() => openable && onOpenVault(d.id)}
          >
            <span className={`tb-dstat ${d.status}`} />
            <KindBadge kind={d.kind} />
            <span className="meta">
              <span className="nm">{d.title}</span>
              <span className="sb">{DELIVERABLE_STATUS_LABEL[d.status]}{d.version ? ` · v${d.version}` : ''} · due {deliverableDue(job, d)}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="tb-form-note" style={{ margin: 0 }}>
        <Ic name="shield" size={14} />
        <span>No-Train Privacy Lock: watermarked viewer, no download or clipboard, every open logged ({job.audit.length} events), sources destroyed at close.</span>
      </div>
    </div>
  );
}
