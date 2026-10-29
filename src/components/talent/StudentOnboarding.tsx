import React, { useMemo, useState, type FormEvent } from 'react';
import {
  TIMEZONES,
  TOOLS,
  WORKSTREAMS,
  emptyProfile,
  initialsOf,
  saveSession,
  type StudentExperience,
  type StudentProfile,
  type StudentProject,
  type StudentSession,
} from './session';
import { TbSelect } from './Select';
import './marketing.css';

function Arrow() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12l4 4L19 6" />
    </svg>
  );
}

const STEPS = [
  { id: 'basics', label: 'Basics', sub: 'Who you are on the bench.', k: '01' },
  { id: 'skills', label: 'Skills', sub: 'Workstreams and tools you take.', k: '02' },
  { id: 'experience', label: 'Experience', sub: 'Club, internship, and projects.', k: '03' },
  { id: 'availability', label: 'Availability', sub: 'Hours, timezone, and payout.', k: '04' },
  { id: 'standing', label: 'Standing', sub: 'Vault rules before you go live.', k: '05' },
] as const;

type StepId = (typeof STEPS)[number]['id'];

interface Props {
  session: StudentSession;
  onComplete: (s: StudentSession) => void;
  onLogout: () => void;
}

function ChipToggle({
  options,
  selected,
  onChange,
  max,
}: {
  options: readonly string[] | string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  return (
    <div className="db-chip-pick">
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            className={`db-chip-pick-btn${on ? ' on' : ''}`}
            onClick={() => {
              if (on) onChange(selected.filter((x) => x !== opt));
              else if (!max || selected.length < max) onChange([...selected, opt]);
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function StudentOnboarding({ session, onComplete, onLogout }: Props) {
  const [step, setStep] = useState<StepId>('basics');
  const [err, setErr] = useState<string | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(() => ({
    ...emptyProfile(),
    ...session.profile,
    concentration: session.profile.concentration || session.major,
    headline: session.profile.headline || `${session.schoolShort} ${session.year.toLowerCase()} · ${session.major || 'Finance'}`,
  }));
  const [langDraft, setLangDraft] = useState('');
  const [coDraft, setCoDraft] = useState('');

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const firmPreview = useMemo(() => {
    const focus = profile.workstreams[0] ?? session.major ?? 'IB scopes';
    return {
      name: session.name,
      school: `${session.schoolShort} ’${session.gradYear}`,
      focus: `${session.major || 'Finance'} · ${focus}`,
      why: [
        `Verified ${session.schoolShort}`,
        profile.tools.slice(0, 2).join(' + ') || 'vault-trained',
        profile.nextFree || 'available this week',
      ].filter(Boolean).join(' · '),
      initials: initialsOf(session.name),
    };
  }, [profile, session]);

  function patch(p: Partial<StudentProfile>) {
    setProfile((prev) => ({ ...prev, ...p }));
    setErr(null);
  }

  function setExp(i: number, field: keyof StudentExperience, value: string) {
    const next = profile.experience.map((e, idx) => (idx === i ? { ...e, [field]: value } : e));
    patch({ experience: next });
  }

  function addExp() {
    if (profile.experience.length >= 4) return;
    patch({ experience: [...profile.experience, { title: '', org: '', detail: '', when: '' }] });
  }

  function setProject(i: number, field: keyof StudentProject, value: string) {
    const next = profile.projects.map((p, idx) => (idx === i ? { ...p, [field]: value } : p));
    patch({ projects: next });
  }

  function addProject() {
    if (profile.projects.length >= 3) return;
    patch({ projects: [...profile.projects, { title: '', detail: '', link: '' }] });
  }

  function validate(current: StepId): string | null {
    if (current === 'basics') {
      if (!profile.headline.trim()) return 'Add a short headline firms will see first.';
      if (!profile.location.trim()) return 'Add your city / campus so firms know your timezone context.';
      if (!profile.bio.trim() || profile.bio.trim().length < 40) {
        return 'Write a short bio (at least a couple sentences) so firms know what you’re good at.';
      }
    }
    if (current === 'skills') {
      if (profile.workstreams.length === 0) return 'Pick at least one workstream you want to take.';
      if (profile.tools.length === 0) return 'Select the tools you actually use.';
    }
    if (current === 'experience') {
      const filled = profile.experience.filter((e) => e.title.trim() && e.org.trim());
      if (filled.length === 0) {
        return 'Add at least one experience — club, class project, or internship. Firms match on this.';
      }
    }
    if (current === 'availability') {
      if (!profile.nextFree.trim()) return 'Tell firms when you’re next free (e.g. “Tonight after 8pm ET”).';
      if (!profile.payoutMethod) return 'Pick a payout method so we can pay you after firm review.';
    }
    if (current === 'standing') {
      if (!profile.responseCommitment) {
        return 'Commit to responding to offers within 24 hours — that’s how you stay matched.';
      }
      if (!profile.vaultOrientationAt) {
        return 'Complete the Vault orientation checklist before you go live.';
      }
    }
    return null;
  }

  function goNext() {
    const v = validate(step);
    if (v) {
      setErr(v);
      return;
    }
    if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1].id);
  }

  function goBack() {
    setErr(null);
    if (stepIndex > 0) setStep(STEPS[stepIndex - 1].id);
  }

  function finish(e: FormEvent) {
    e.preventDefault();
    const v = validate('standing');
    if (v) {
      setErr(v);
      return;
    }
    const fromExp = profile.experience.map((e) => e.org.trim()).filter(Boolean);
    const companies = [...new Set([...profile.companies.map((c) => c.trim()).filter(Boolean), ...fromExp])];
    const cleaned: StudentProfile = {
      ...profile,
      experience: profile.experience.filter((x) => x.title.trim() && x.org.trim()),
      projects: profile.projects.filter((x) => x.title.trim()),
      companies,
      vaultOrientationAt: profile.vaultOrientationAt ?? new Date().toISOString(),
      profileCompletedAt: new Date().toISOString(),
    };
    const next: StudentSession = { ...session, major: cleaned.concentration || session.major, profile: cleaned };
    saveSession(next);
    onComplete(next);
  }

  function markOrientation() {
    patch({ vaultOrientationAt: new Date().toISOString() });
  }

  return (
    <div className="db-mkt db-onboard">
      <header className="db-onboard-top">
        <div className="db-onboard-brand">
          <span className="db-nav-glyph">C</span>
          CLARVY
          <span className="db-onboard-tag">Student profile</span>
        </div>
        <button type="button" className="db-btn ghost" onClick={onLogout}>Log out</button>
      </header>

      <div className="db-onboard-progress" aria-hidden="true">
        <div style={{ width: `${progress}%` }} />
      </div>

      <div className="db-onboard-shell">
        <aside className="db-onboard-side">
          <div className="db-onboard-side-head">
            <span className="k">Build your bench profile</span>
            <h1>Firms match you on this — not a résumé PDF.</h1>
            <p>
              Complete every step once. Your track record, standing, and availability live here so banks
              know who you are before they send an offer.
            </p>
          </div>
          <ol className="db-onboard-steps db-ob-firm-steps">
            {STEPS.map((s, i) => (
              <li key={s.id} className={i < stepIndex ? 'done' : i === stepIndex ? 'now' : ''}>
                <span className="n">{s.k}</span>
                <div>
                  <strong>{s.label}</strong>
                  <small>{s.sub}</small>
                </div>
              </li>
            ))}
          </ol>

          <div className="db-onboard-preview">
            <div className="cap">Firm preview · how you’ll appear</div>
            <div className="card">
              <span className="av">{firmPreview.initials}</span>
              <div>
                <strong>{firmPreview.name}</strong>
                <span>{firmPreview.school} · {firmPreview.focus}</span>
                <em>{firmPreview.why}</em>
              </div>
              <b>96%</b>
            </div>
          </div>
        </aside>

        <form className="db-onboard-main" onSubmit={finish}>
          {err ? <div className="db-err">{err}</div> : null}

          {step === 'basics' ? (
            <section>
              <h2>Who you are</h2>
              <p className="lead">Verified from your .edu — fill in the rest so firms can pick you with confidence.</p>
              <div className="db-ok" style={{ marginBottom: 16 }}>
                <Check /> {session.schoolName} · {session.email} · Class of ’{session.gradYear}
              </div>
              <div className="db-field">
                <label htmlFor="ob-head">Headline</label>
                <input
                  id="ob-head"
                  value={profile.headline}
                  onChange={(e) => patch({ headline: e.target.value })}
                  placeholder="Wharton junior · M&A decks and comps"
                  maxLength={80}
                />
                <div className="hint">Shown first on every match card. Keep it specific.</div>
              </div>
              <div className="db-field-row">
                <div className="db-field">
                  <label htmlFor="ob-conc">Concentration / major</label>
                  <input id="ob-conc" value={profile.concentration} onChange={(e) => patch({ concentration: e.target.value })} placeholder="Finance" />
                </div>
                <div className="db-field">
                  <label htmlFor="ob-gpa">GPA <span style={{ fontWeight: 400, color: 'var(--m-ink-3)' }}>(optional)</span></label>
                  <input id="ob-gpa" value={profile.gpa} onChange={(e) => patch({ gpa: e.target.value })} placeholder="3.7" />
                </div>
              </div>
              <div className="db-field-row">
                <div className="db-field">
                  <label htmlFor="ob-loc">City / campus</label>
                  <input id="ob-loc" value={profile.location} onChange={(e) => patch({ location: e.target.value })} placeholder="Philadelphia, PA" />
                </div>
                <div className="db-field">
                  <label htmlFor="ob-li">LinkedIn <span style={{ fontWeight: 400, color: 'var(--m-ink-3)' }}>(optional)</span></label>
                  <input id="ob-li" value={profile.linkedIn} onChange={(e) => patch({ linkedIn: e.target.value })} placeholder="linkedin.com/in/…" />
                </div>
              </div>
              <div className="db-field">
                <label htmlFor="ob-gh">GitHub <span style={{ fontWeight: 400, color: 'var(--m-ink-3)' }}>(optional — models, scrapers, case packs)</span></label>
                <input id="ob-gh" value={profile.github} onChange={(e) => patch({ github: e.target.value })} placeholder="github.com/you" />
              </div>
              <div className="db-field">
                <label htmlFor="ob-bio">Bio</label>
                <textarea
                  id="ob-bio"
                  value={profile.bio}
                  onChange={(e) => patch({ bio: e.target.value })}
                  placeholder="What you’re strong at, what scopes you want, and any relevant club or internship context. Firms read this before they send an offer."
                />
              </div>
            </section>
          ) : null}

          {step === 'skills' ? (
            <section>
              <h2>What you take</h2>
              <p className="lead">Workstreams and tools drive matching. Be honest — a bad match hurts your standing.</p>
              <div className="db-field">
                <label>Workstreams you want</label>
                <ChipToggle
                  options={WORKSTREAMS}
                  selected={profile.workstreams}
                  onChange={(workstreams) => patch({ workstreams })}
                />
              </div>
              <div className="db-field">
                <label>Tools you use</label>
                <ChipToggle
                  options={TOOLS}
                  selected={profile.tools}
                  onChange={(tools) => patch({ tools })}
                />
              </div>
              <div className="db-field">
                <label>Languages</label>
                <div className="db-chip-pick">
                  {profile.languages.map((l) => (
                    <button
                      key={l}
                      type="button"
                      className="db-chip-pick-btn on"
                      onClick={() => patch({ languages: profile.languages.filter((x) => x !== l) })}
                      title="Remove"
                    >
                      {l} ×
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    value={langDraft}
                    onChange={(e) => setLangDraft(e.target.value)}
                    placeholder="Add language"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const t = langDraft.trim();
                        if (t && !profile.languages.includes(t)) {
                          patch({ languages: [...profile.languages, t] });
                          setLangDraft('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="db-btn secondary"
                    onClick={() => {
                      const t = langDraft.trim();
                      if (t && !profile.languages.includes(t)) {
                        patch({ languages: [...profile.languages, t] });
                        setLangDraft('');
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          {step === 'experience' ? (
            <section>
              <h2>Proof you’re ready</h2>
              <p className="lead">Experience, companies you’ve touched, and optional projects firms can open.</p>
              {profile.experience.map((exp, i) => (
                <div key={i} className="db-onboard-exp">
                  <div className="db-field-row">
                    <div className="db-field">
                      <label>Role</label>
                      <input value={exp.title} onChange={(e) => setExp(i, 'title', e.target.value)} placeholder="Analyst" />
                    </div>
                    <div className="db-field">
                      <label>Org</label>
                      <input value={exp.org} onChange={(e) => setExp(i, 'org', e.target.value)} placeholder="Finance Club / boutique" />
                    </div>
                  </div>
                  <div className="db-field">
                    <label>When <span style={{ fontWeight: 400, color: 'var(--m-ink-3)' }}>(optional)</span></label>
                    <input value={exp.when || ''} onChange={(e) => setExp(i, 'when', e.target.value)} placeholder="Summer 2025" />
                  </div>
                  <div className="db-field">
                    <label>What you did</label>
                    <textarea
                      value={exp.detail}
                      onChange={(e) => setExp(i, 'detail', e.target.value)}
                      placeholder="One or two lines on the deliverable — decks, comps, CIM sections…"
                    />
                  </div>
                </div>
              ))}
              {profile.experience.length < 4 ? (
                <button type="button" className="db-btn secondary" onClick={addExp}>+ Add experience</button>
              ) : null}

              <div className="db-field" style={{ marginTop: 22 }}>
                <label>Companies &amp; orgs you’ve worked with</label>
                <div className="db-chip-pick">
                  {profile.companies.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="db-chip-pick-btn on"
                      onClick={() => patch({ companies: profile.companies.filter((x) => x !== c) })}
                    >
                      {c} ×
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    value={coDraft}
                    onChange={(e) => setCoDraft(e.target.value)}
                    placeholder="e.g. Evercore, Finance Club"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const t = coDraft.trim();
                        if (t && !profile.companies.includes(t)) {
                          patch({ companies: [...profile.companies, t] });
                          setCoDraft('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="db-btn secondary"
                    onClick={() => {
                      const t = coDraft.trim();
                      if (t && !profile.companies.includes(t)) {
                        patch({ companies: [...profile.companies, t] });
                        setCoDraft('');
                      }
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              <h3 style={{ marginTop: 26, fontSize: 15 }}>Projects <span style={{ fontWeight: 400, color: 'var(--m-ink-3)', fontSize: 13 }}>(optional)</span></h3>
              <p className="lead" style={{ marginTop: 4 }}>GitHub repos, case packs, scrapers — anything a firm can peek at.</p>
              {profile.projects.map((p, i) => (
                <div key={i} className="db-onboard-exp">
                  <div className="db-field-row">
                    <div className="db-field">
                      <label>Title</label>
                      <input value={p.title} onChange={(e) => setProject(i, 'title', e.target.value)} placeholder="LBO case pack" />
                    </div>
                    <div className="db-field">
                      <label>Link</label>
                      <input value={p.link || ''} onChange={(e) => setProject(i, 'link', e.target.value)} placeholder="github.com/you/repo" />
                    </div>
                  </div>
                  <div className="db-field">
                    <label>What it is</label>
                    <textarea value={p.detail} onChange={(e) => setProject(i, 'detail', e.target.value)} placeholder="One line on what firms will see." />
                  </div>
                </div>
              ))}
              {profile.projects.length < 3 ? (
                <button type="button" className="db-btn secondary" onClick={addProject}>+ Add project</button>
              ) : null}
            </section>
          ) : null}

          {step === 'availability' ? (
            <section>
              <h2>When firms can get you</h2>
              <p className="lead">Matching weights availability hard. Update this whenever your week changes.</p>
              <div className="db-field-row">
                <div className="db-field">
                  <label htmlFor="ob-hrs">Hours / week</label>
                  <TbSelect
                    id="ob-hrs"
                    value={profile.hoursPerWeek}
                    onChange={(v) => patch({ hoursPerWeek: v })}
                    options={['4–6', '8–12', '10–15', '15–20', '20+'].map((v) => ({ value: v, label: v }))}
                  />
                </div>
                <div className="db-field">
                  <label htmlFor="ob-tz">Timezone</label>
                  <TbSelect
                    id="ob-tz"
                    value={profile.timezone}
                    onChange={(v) => patch({ timezone: v })}
                    options={TIMEZONES.map((t) => ({ value: t, label: t }))}
                  />
                </div>
              </div>
              <div className="db-field">
                <label htmlFor="ob-free">Next free window</label>
                <input
                  id="ob-free"
                  value={profile.nextFree}
                  onChange={(e) => patch({ nextFree: e.target.value })}
                  placeholder="Tonight after 8pm ET · free Sat morning"
                />
                <div className="hint">Shown on your match card. Firms use this to decide who to offer first.</div>
              </div>
              <div className="db-field">
                <label>Payout method</label>
                <div className="db-chip-pick">
                  {([
                    ['ach', 'ACH / bank'],
                    ['wise', 'Wise'],
                    ['paypal', 'PayPal'],
                  ] as const).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={`db-chip-pick-btn${profile.payoutMethod === id ? ' on' : ''}`}
                      onClick={() => patch({ payoutMethod: id })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="hint">Paid after the firm marks your deliverable reviewed. No fees on your payout.</div>
              </div>
            </section>
          ) : null}

          {step === 'standing' ? (
            <section>
              <h2>How you stay on the bench</h2>
              <p className="lead">
                Clarvy isn’t a gig board you ghost. Standing, re-verification, and your track record are what keep
                you matched — and what make ditching costly.
              </p>

              <div className="db-onboard-rules">
                <article>
                  <h3>1. Track record lives here</h3>
                  <p>
                    Every firm review updates your standing. Leave and you lose preferential matching and the portfolio
                    banks can actually read. Alumni keep the record, but matching pauses.
                  </p>
                </article>
                <article>
                  <h3>2. Term re-verification</h3>
                  <p>
                    We re-check your .edu each term (next: {new Date(session.standing.nextReverifyAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}).
                    Drop enrollment and matching freezes automatically — no “alumni pretending.”
                  </p>
                </article>
                <article>
                  <h3>3. Response & on-time standing</h3>
                  <p>
                    Ignore offers or miss deadlines and your match score drops. Ghosting one firm makes the next three
                    less likely to pick you.
                  </p>
                </article>
                <article>
                  <h3>4. Paid engagements</h3>
                  <p>
                    You get paid after firm review. Staying means income and a reputation that compounds. Ditching means
                    starting from zero somewhere else that banks don’t trust.
                  </p>
                </article>
              </div>

              <div className="db-onboard-orient">
                <div>
                  <h3>Vault orientation</h3>
                  <p>Required before your first match. Confirms you understand no-download, watermarking, and the NDA.</p>
                  <ul>
                    <li>Files never leave the watermarked viewer</li>
                    <li>No screenshots, copy, or transcription</li>
                    <li>Sources destroyed when the firm closes</li>
                    <li>You’re bound by the Ironclad Vault NDA</li>
                  </ul>
                </div>
                {profile.vaultOrientationAt ? (
                  <div className="db-ok"><Check /> Orientation complete</div>
                ) : (
                  <button type="button" className="db-btn primary" onClick={markOrientation}>
                    Mark orientation complete
                  </button>
                )}
              </div>

              <label className="db-check" style={{ marginTop: 16 }}>
                <input
                  type="checkbox"
                  checked={profile.responseCommitment}
                  onChange={(e) => patch({ responseCommitment: e.target.checked })}
                />
                <span>
                  I commit to responding to offers within 24 hours and to keeping my availability current. I understand
                  that ignored offers and missed deadlines lower my standing and can pause matching.
                </span>
              </label>
            </section>
          ) : null}

          <div className="db-onboard-actions">
            {stepIndex > 0 ? (
              <button type="button" className="db-btn ghost" onClick={goBack}>Back</button>
            ) : (
              <span />
            )}
            {step !== 'standing' ? (
              <button type="button" className="db-btn primary" onClick={goNext}>
                Continue <Arrow />
              </button>
            ) : (
              <button type="submit" className="db-btn primary">
                Go live on the bench <Arrow />
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
