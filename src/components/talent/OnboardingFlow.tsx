import React, { useMemo, useState } from 'react';
import StudentOnboarding from './StudentOnboarding';
import { TbSelect } from './Select';
import {
  WORKSTREAMS,
  clearSession,
  demoCompleteStudent,
  firmFromForm,
  saveSession,
  type ClarvySession,
  type FirmSession,
  type StudentSession,
} from './session';
import './marketing.css';

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

const FIRM_STEPS = [
  { id: 'company', label: 'Company details', sub: 'Basic information about your organization.' },
  { id: 'role', label: 'Your role', sub: 'How you’ll manage the workspace.' },
  { id: 'prefs', label: 'Workspace preferences', sub: 'How work is scoped and secured.' },
  { id: 'team', label: 'Team structure', sub: 'How people and coverage are organized.' },
  { id: 'invite', label: 'Invite team members', sub: 'Bring others into the workspace.' },
  { id: 'nda', label: 'Vault NDA', sub: 'Mutual NDA before anything can upload.' },
] as const;

type FirmStepId = (typeof FIRM_STEPS)[number]['id'];

interface FirmDraft {
  firm: string;
  size: string;
  industry: string;
  website: string;
  name: string;
  title: string;
  email: string;
  manageStyle: string;
  workstreams: string[];
  clearance: string;
  codenamesOnly: boolean;
  teams: string[];
  invites: string[];
  ndaSigned: boolean;
}

const PREFILL_FIRM: FirmDraft = {
  firm: 'Meridian Partners',
  size: '11–50',
  industry: 'Boutique M&A',
  website: 'meridianpartners.com',
  name: 'Jane Whitfield',
  title: 'Partner',
  email: 'jane@meridianpartners.com',
  manageStyle: 'I own staffing and review for my coverage group',
  workstreams: ['Pitch decks', 'Comps & precedents', 'CIMs / teasers'],
  clearance: 'Standard NDA',
  codenamesOnly: true,
  teams: ['M&A coverage', 'Restructuring'],
  invites: ['alex.kim@meridianpartners.com', 'priya.shah@meridianpartners.com'],
  ndaSigned: false,
};

interface Props {
  session: ClarvySession | null;
  onAuth: (s: ClarvySession) => void;
  /** Clear parent session without leaving /onboarding (role switch / firm path). */
  onClearSession: () => void;
  onStudentComplete: (s: StudentSession) => void;
  onLogout: () => void;
}

export default function OnboardingFlow({ session, onAuth, onClearSession, onStudentComplete, onLogout }: Props) {
  const [phase, setPhase] = useState<'choose' | 'firm' | 'student'>(() => {
    if (session?.role === 'student' && !session.profile.profileCompletedAt) return 'student';
    if (session?.role === 'student') return 'student';
    return 'choose';
  });
  const [firmStep, setFirmStep] = useState<FirmStepId>('company');
  const [draft, setDraft] = useState<FirmDraft>(PREFILL_FIRM);
  const [inviteDraft, setInviteDraft] = useState('');
  const [teamDraft, setTeamDraft] = useState('');

  const firmIndex = FIRM_STEPS.findIndex((s) => s.id === firmStep);
  const firmProgress = ((firmIndex + 1) / FIRM_STEPS.length) * 100;

  const studentSession = useMemo(() => {
    if (session?.role === 'student') return session;
    return null;
  }, [session]);

  function patchFirm(p: Partial<FirmDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function chooseStudent() {
    const s = demoCompleteStudent();
    // Prefill everything, but force the walkthrough so Skip → next → next works
    s.profile = {
      ...s.profile,
      profileCompletedAt: null,
      vaultOrientationAt: new Date().toISOString(),
      responseCommitment: true,
    };
    saveSession(s);
    setPhase('student');
    onAuth(s);
  }

  function chooseFirm() {
    onClearSession();
    setDraft(PREFILL_FIRM);
    setFirmStep('company');
    setPhase('firm');
  }

  function firmNext() {
    if (firmIndex < FIRM_STEPS.length - 1) {
      setFirmStep(FIRM_STEPS[firmIndex + 1].id);
      return;
    }
    finishFirm();
  }

  function firmBack() {
    if (firmIndex > 0) setFirmStep(FIRM_STEPS[firmIndex - 1].id);
    else setPhase('choose');
  }

  function finishFirm() {
    const s: FirmSession = firmFromForm({
      name: draft.name,
      email: draft.email,
      firm: draft.firm,
      title: draft.title,
    });
    s.ndaSignedAt = new Date().toISOString();
    saveSession(s);
    onAuth(s);
  }

  function toggleWs(ws: string) {
    patchFirm({
      workstreams: draft.workstreams.includes(ws)
        ? draft.workstreams.filter((w) => w !== ws)
        : [...draft.workstreams, ws],
    });
  }

  if (phase === 'choose') {
    return (
      <div className="db-mkt db-onboard db-ob-choose">
        <header className="db-onboard-top">
          <div className="db-onboard-brand">
            <span className="db-nav-glyph">C</span>
            CLARVY
            <span className="db-onboard-tag">Demo onboarding</span>
          </div>
          <button type="button" className="db-btn ghost" onClick={onLogout}>Exit</button>
        </header>

        <div className="db-ob-choose-inner">
          <span className="k">Skip → walk through setup</span>
          <h1>Who are you onboarding as?</h1>
          <p>
            Everything is prefilled. Click Continue through each step to see how company and student
            setup is supposed to play out — then land in the live demo dashboard.
          </p>
          <div className="db-ob-choose-cards">
            <button type="button" className="db-ob-choose-card" onClick={chooseFirm}>
              <figure>
                <img src="/talent/offer-firms.jpg" alt="" />
              </figure>
              <div>
                <strong>Company / firm</strong>
                <span>Meridian Partners · Partner Jane Whitfield. Company details → NDA → Vault.</span>
              </div>
              <em>Continue <Arrow /></em>
            </button>
            <button type="button" className="db-ob-choose-card" onClick={chooseStudent}>
              <figure>
                <img src="/talent/offer-students.jpg" alt="" />
              </figure>
              <div>
                <strong>Student</strong>
                <span>Sofia Chen · Wharton ’26. Profile, skills, Vault orientation → bench.</span>
              </div>
              <em>Continue <Arrow /></em>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'student' && studentSession) {
    return (
      <StudentOnboarding
        session={studentSession}
        onComplete={onStudentComplete}
        onLogout={() => {
          clearSession();
          onLogout();
        }}
      />
    );
  }

  // ---------- Firm onboarding ----------
  return (
    <div className="db-mkt db-onboard">
      <header className="db-onboard-top">
        <div className="db-onboard-brand">
          <span className="db-nav-glyph">C</span>
          CLARVY
          <span className="db-onboard-tag">Firm setup</span>
        </div>
        <button
          type="button"
          className="db-btn ghost"
          onClick={() => {
            clearSession();
            setPhase('choose');
          }}
        >
          Switch role
        </button>
      </header>

      <div className="db-onboard-progress" aria-hidden="true">
        <div style={{ width: `${firmProgress}%` }} />
      </div>

      <div className="db-onboard-shell db-ob-firm-shell">
        <aside className="db-onboard-side">
          <ol className="db-onboard-steps db-ob-firm-steps">
            {FIRM_STEPS.map((s, i) => (
              <li key={s.id} className={i < firmIndex ? 'done' : i === firmIndex ? 'now' : ''}>
                <span className="n">{i + 1}</span>
                <div>
                  <strong>{s.label}</strong>
                  <small>{s.sub}</small>
                </div>
              </li>
            ))}
          </ol>
        </aside>

        <div className="db-onboard-main">
          {firmStep === 'company' ? (
            <section>
              <h2>Company details</h2>
              <p className="lead">This information defines your workspace and can be updated later.</p>
              <div className="db-field-row">
                <div className="db-field">
                  <label htmlFor="ob-firm">Company name *</label>
                  <input id="ob-firm" value={draft.firm} onChange={(e) => patchFirm({ firm: e.target.value })} />
                </div>
                <div className="db-field">
                  <label htmlFor="ob-size">Company size *</label>
                  <TbSelect
                    id="ob-size"
                    value={draft.size}
                    onChange={(v) => patchFirm({ size: v })}
                    options={['1–10', '11–50', '51–200', '201–500', '500+'].map((v) => ({ value: v, label: v }))}
                  />
                </div>
              </div>
              <div className="db-field-row">
                <div className="db-field">
                  <label htmlFor="ob-ind">Industry *</label>
                  <TbSelect
                    id="ob-ind"
                    value={draft.industry}
                    onChange={(v) => patchFirm({ industry: v })}
                    options={['Boutique M&A', 'Bulge bracket', 'Restructuring', 'Sponsor coverage', 'Corporate development', 'Other'].map((v) => ({ value: v, label: v }))}
                  />
                </div>
                <div className="db-field">
                  <label htmlFor="ob-web">Company website</label>
                  <input id="ob-web" value={draft.website} onChange={(e) => patchFirm({ website: e.target.value })} />
                </div>
              </div>
            </section>
          ) : null}

          {firmStep === 'role' ? (
            <section>
              <h2>Your role</h2>
              <p className="lead">You’re the primary admin for this Clarvy workspace.</p>
              <div className="db-field-row">
                <div className="db-field">
                  <label htmlFor="ob-name">Full name *</label>
                  <input id="ob-name" value={draft.name} onChange={(e) => patchFirm({ name: e.target.value })} />
                </div>
                <div className="db-field">
                  <label htmlFor="ob-title">Title *</label>
                  <input id="ob-title" value={draft.title} onChange={(e) => patchFirm({ title: e.target.value })} />
                </div>
              </div>
              <div className="db-field">
                <label htmlFor="ob-email">Work email *</label>
                <input id="ob-email" type="email" value={draft.email} onChange={(e) => patchFirm({ email: e.target.value })} />
              </div>
              <div className="db-field">
                <label>How you’ll manage the workspace</label>
                <div className="db-chip-pick">
                  {[
                    'I own staffing and review for my coverage group',
                    'I coordinate across multiple deal teams',
                    'I’m setting this up for partners to staff later',
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`db-chip-pick-btn${draft.manageStyle === opt ? ' on' : ''}`}
                      onClick={() => patchFirm({ manageStyle: opt })}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          {firmStep === 'prefs' ? (
            <section>
              <h2>Workspace preferences</h2>
              <p className="lead">Defaults for every deal room you open. Change per engagement later.</p>
              <div className="db-field">
                <label>Workstreams you staff most</label>
                <div className="db-chip-pick">
                  {WORKSTREAMS.map((ws) => (
                    <button
                      key={ws}
                      type="button"
                      className={`db-chip-pick-btn${draft.workstreams.includes(ws) ? ' on' : ''}`}
                      onClick={() => toggleWs(ws)}
                    >
                      {ws}
                    </button>
                  ))}
                </div>
              </div>
              <div className="db-field-row">
                <div className="db-field">
                  <label htmlFor="ob-clear">Default clearance</label>
                  <TbSelect
                    id="ob-clear"
                    value={draft.clearance}
                    onChange={(v) => patchFirm({ clearance: v })}
                    options={['Standard NDA', 'Elevated', 'Restricted'].map((v) => ({ value: v, label: v }))}
                  />
                </div>
                <div className="db-field">
                  <label>Codename policy</label>
                  <label className="db-check" style={{ marginTop: 10 }}>
                    <input
                      type="checkbox"
                      checked={draft.codenamesOnly}
                      onChange={(e) => patchFirm({ codenamesOnly: e.target.checked })}
                    />
                    <span>Codenames only in rooms (recommended)</span>
                  </label>
                </div>
              </div>
            </section>
          ) : null}

          {firmStep === 'team' ? (
            <section>
              <h2>Team structure</h2>
              <p className="lead">Groups show up when you staff a room — optional, but useful for larger shops.</p>
              <ul className="db-ob-list">
                {draft.teams.map((t) => (
                  <li key={t}>
                    <span>{t}</span>
                    <button
                      type="button"
                      className="db-btn ghost"
                      onClick={() => patchFirm({ teams: draft.teams.filter((x) => x !== t) })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="db-ob-add-row">
                <input
                  value={teamDraft}
                  onChange={(e) => setTeamDraft(e.target.value)}
                  placeholder="Add a team (e.g. FIG coverage)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = teamDraft.trim();
                      if (v && !draft.teams.includes(v)) {
                        patchFirm({ teams: [...draft.teams, v] });
                        setTeamDraft('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="db-btn secondary"
                  onClick={() => {
                    const v = teamDraft.trim();
                    if (v && !draft.teams.includes(v)) {
                      patchFirm({ teams: [...draft.teams, v] });
                      setTeamDraft('');
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </section>
          ) : null}

          {firmStep === 'invite' ? (
            <section>
              <h2>Invite team members</h2>
              <p className="lead">They’ll get access once the Vault NDA is signed. You can skip and invite later.</p>
              <ul className="db-ob-list">
                {draft.invites.map((em) => (
                  <li key={em}>
                    <span>{em}</span>
                    <button
                      type="button"
                      className="db-btn ghost"
                      onClick={() => patchFirm({ invites: draft.invites.filter((x) => x !== em) })}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              <div className="db-ob-add-row">
                <input
                  type="email"
                  value={inviteDraft}
                  onChange={(e) => setInviteDraft(e.target.value)}
                  placeholder="colleague@firm.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = inviteDraft.trim().toLowerCase();
                      if (v && !draft.invites.includes(v)) {
                        patchFirm({ invites: [...draft.invites, v] });
                        setInviteDraft('');
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  className="db-btn secondary"
                  onClick={() => {
                    const v = inviteDraft.trim().toLowerCase();
                    if (v && !draft.invites.includes(v)) {
                      patchFirm({ invites: [...draft.invites, v] });
                      setInviteDraft('');
                    }
                  }}
                >
                  Add
                </button>
              </div>
            </section>
          ) : null}

          {firmStep === 'nda' ? (
            <section>
              <h2>Sign the Vault NDA</h2>
              <p className="lead">
                Upload stays locked until the mutual NDA is signed. This is the same instrument every matched
                analyst signs before they see a page.
              </p>
              <div className="db-onboard-orient">
                <div>
                  <h3>Ironclad Vault NDA · {draft.firm}</h3>
                  <p>Covers Clarvy and every analyst on an engagement. Highlights:</p>
                  <ul>
                    <li>Files stay in the watermarked viewer — no download or copy</li>
                    <li>Codenames only when the room policy requires it</li>
                    <li>Sources destroyed when you close the engagement</li>
                    <li>Audit trail retained with the room</li>
                  </ul>
                </div>
                {draft.ndaSigned ? (
                  <div className="db-ok">Signed · {draft.name} · {new Date().toLocaleDateString()}</div>
                ) : (
                  <button type="button" className="db-btn primary" onClick={() => patchFirm({ ndaSigned: true })}>
                    Sign mutual NDA
                  </button>
                )}
              </div>
            </section>
          ) : null}

          <div className="db-onboard-actions">
            <button type="button" className="db-btn ghost" onClick={firmBack}>
              {firmIndex === 0 ? 'Back' : 'Back'}
            </button>
            <button
              type="button"
              className="db-btn primary"
              disabled={firmStep === 'nda' && !draft.ndaSigned}
              onClick={firmNext}
            >
              {firmStep === 'nda' ? (
                <>Open firm dashboard <Arrow /></>
              ) : (
                <>Continue <Arrow /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
