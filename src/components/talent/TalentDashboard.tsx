import React, { useState } from 'react';
import {
  Analyst,
  DELIVERABLE_STATUS_LABEL,
  DemoActions,
  DemoState,
  RoleMode,
  TalentFirm,
  coachFor,
  deliverableDue,
  deliverableProgress,
  pipelineStages,
  selectedAnalyst,
} from './demoStore';
import {
  AppSidebar,
  CompanyNavPanels,
  Ic,
  KindBadge,
  NavId,
  ProfilePanel,
  ShellUser,
} from './TalentNav';
import { CompanyHomeDesk } from './HomeDesk';
import NewRequestModal from './NewRequestModal';
import { Avatar, PersonProfilePage } from './PersonProfile';
import VaultWorkspace from './VaultWorkspace';
import type { StudentSession } from './session';

export interface ShellProps {
  user: ShellUser;
  student?: StudentSession | null;
  onHelp: () => void;
  onLogout: () => void;
  onSite: () => void;
  onEditProfile?: () => void;
}

interface Props extends ShellProps {
  firm: TalentFirm;
  ndaSignedAt: string | null;
  role: RoleMode;
  onRoleChange: (role: RoleMode) => void;
  demo: DemoState;
  actions: DemoActions;
}

export function PipelineBar({ step }: { step: DemoState['step'] }) {
  const stages = pipelineStages(step);
  return (
    <div className="tb-pipeline" aria-label="Engagement pipeline">
      {stages.map((s, i) => (
        <React.Fragment key={s.id}>
          {i > 0 ? <span className={`tb-pipe-line ${stages[i - 1].state !== 'todo' ? 'on' : ''}`} /> : null}
          <span className={`tb-pipe-step ${s.state}`}>{s.label}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

export default function TalentDashboard({ firm, ndaSignedAt, role, onRoleChange, demo, actions, user, student, onHelp, onLogout, onSite, onEditProfile }: Props) {
  const [nav, setNav] = useState<NavId>('home');
  const [showRequest, setShowRequest] = useState(false);
  const [requestWorkflow, setRequestWorkflow] = useState<string | undefined>(undefined);
  const [viewer, setViewer] = useState<{ open: boolean; deliverableId: string | null }>({ open: false, deliverableId: null });
  const [profilePerson, setProfilePerson] = useState<Analyst | null>(null);
  const [profileBack, setProfileBack] = useState<NavId>('home');

  function openRequest(workflowId?: string) {
    setRequestWorkflow(workflowId);
    setShowRequest(true);
  }

  function openPerson(a: Analyst, back: NavId = nav) {
    setProfileBack(back);
    setProfilePerson(a);
  }
  function closePerson() {
    setProfilePerson(null);
  }

  const coach = coachFor(demo.step, 'company');
  const empty = demo.step === 'empty';
  const job = demo.job;
  const analyst = selectedAnalyst(job);
  const progress = deliverableProgress(job);
  const liveCount = job && (job.status === 'in_progress' || job.status === 'submitted') ? 1 : 0;
  const vaultOpenable = !!job && (job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed');

  function goHome() { setNav('home'); }
  function openVault(deliverableId: string | null = null) { setViewer({ open: true, deliverableId }); }
  function closeVault() { setViewer({ open: false, deliverableId: null }); }

  function onCoachCta() {
    if (!coach) return;
    if (coach.targetRole) onRoleChange(coach.targetRole);
    else if (coach.primaryAction === 'new_request') openRequest();
    else if (coach.primaryAction === 'select_top' && job?.matches[0]) actions.selectAnalyst(job.matches[0].id);
    else if (coach.primaryAction === 'open_vault') openVault();
    else if (coach.primaryAction === 'reset') actions.reset();
  }

  return (
    <div className="tb-app">
      <AppSidebar
        role={role}
        onRoleChange={onRoleChange}
        nav={nav}
        onNav={(id) => { setProfilePerson(null); setNav(id); }}
        onReset={actions.reset}
        liveCount={liveCount || undefined}
        user={user}
        onHelp={onHelp}
        onLogout={onLogout}
        onSite={onSite}
      />

      <main className="tb-main">
        <div className="tb-topbar">
          <div className="tb-page-title">
            <strong>
              {profilePerson
                ? profilePerson.name
                : nav === 'home' ? 'Home'
                  : nav === 'rooms' ? 'Deal rooms'
                    : nav === 'search' ? 'Search'
                      : nav === 'bench' ? 'Talent bench'
                        : nav === 'messages' ? 'Messages'
                          : nav === 'saved' ? 'Saved'
                            : nav === 'deadlines' ? 'Deadlines'
                              : nav === 'vault' ? 'Vault'
                                : nav === 'profile' ? 'Profile'
                                  : 'Home'}
            </strong>
          </div>
          <div className="right">
            <span className="tb-lock-chip" title={`NDA signed ${ndaSignedAt}`}>
              <Ic name="shield" size={13} /> No-Train Lock · NDA on file
            </span>
            <button type="button" className="tb-new-btn" onClick={() => openRequest()}>
              <Ic name="plus" size={13} /> New request
            </button>
          </div>
        </div>

        <div className="tb-stage">
        {profilePerson ? (
          <div className="tb-panel-wrap">
            <PersonProfilePage
              person={profilePerson}
              backLabel={profileBack === 'bench' ? 'Talent bench' : profileBack === 'messages' ? 'Messages' : 'Home'}
              onBack={() => { closePerson(); setNav(profileBack); }}
              onOffer={demo.step === 'matching' ? () => { actions.selectAnalyst(profilePerson.id); closePerson(); setNav('home'); } : undefined}
              onMessage={vaultOpenable && analyst?.id === profilePerson.id ? () => { closePerson(); setNav('messages'); } : undefined}
            />
          </div>
        ) : nav === 'home' ? (
          empty ? (
            <div className="tb-panel-wrap">
              <CompanyHomeDesk
                firm={firm}
                contactName={firm.contact}
                onNewRequest={() => openRequest()}
                onPickWorkflow={(id) => openRequest(id)}
                onOpenBench={() => setNav('bench')}
              />
            </div>
          ) : (
          <>
            <PipelineBar step={demo.step} />

            {coach ? (
              <div className={`tb-coach${demo.step === 'complete' ? ' done' : ''}`}>
                <div className="tb-coach-copy">
                  <strong>{coach.title}</strong>
                  <span>{coach.body}</span>
                </div>
                <div className="tb-coach-actions">
                  <button type="button" className="tb-btn primary" onClick={onCoachCta}>{coach.cta}</button>
                  <button type="button" className="tb-btn ghost" onClick={actions.reset}>Reset</button>
                </div>
              </div>
            ) : null}

            <div className="tb-content">
              <section className="tb-feed">
                <div className="tb-section-head"><h2>Activity feed</h2></div>
                <>
                    <div className="tb-feed-group-label">Today</div>
                    {demo.companyFeed.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="tb-feed-item"
                        onClick={() => vaultOpenable && openVault()}
                      >
                        <span className="tb-tile" style={{ background: f.color }}>{f.tile}</span>
                        <span className="meta">
                          <span className="name">{f.name}</span>
                          <span className="sub">{f.sub}</span>
                          {f.note ? <span className="tb-feed-note">{f.note}</span> : null}
                        </span>
                        {f.unread ? <span className="unread" /> : null}
                      </button>
                    ))}
                  </>
              </section>

              <div className="tb-right">
                <section>
                  <div className="tb-section-head">
                    <h2>{demo.step === 'matching' ? 'Matched talent' : analyst ? 'Connected analyst' : 'Talent connection'}</h2>
                    {demo.step !== 'matching' ? (
                      <button type="button" className="tb-link" onClick={() => setNav('bench')}>Talent bench <Ic name="arrowR" size={12} /></button>
                    ) : null}
                  </div>

                  {demo.step === 'matching' && job ? (
                    <div className="tb-match-list">
                      {job.matches.map((a, i) => (
                        <div className="tb-match-card" key={a.id}>
                          <button type="button" className="tb-match-hit" onClick={() => openPerson(a, 'home')}>
                            <Avatar seed={a.id} name={a.name} photoUrl={a.photoUrl} color={a.color} size={40} />
                            <div className="meta">
                              <div className="name">
                                {a.name}
                                {i === 0 ? <span className="tb-pill green" style={{ marginLeft: 8 }}>Best match</span> : null}
                              </div>
                              <div className="sub">
                                {a.headline ? <>{a.headline} · </> : null}
                                {a.school} &rsquo;{a.year} · {a.focus} · {a.score}%
                              </div>
                              <div className="why">{a.why}</div>
                              {(a.tools?.length || a.availability || a.standing != null) ? (
                                <div className="why-extra">
                                  {a.availability ? <span>{a.availability}</span> : null}
                                  {a.tools?.slice(0, 3).map((t) => <span key={t}>{t}</span>)}
                                  {a.standing != null ? <span>Standing {a.standing}</span> : null}
                                  {a.engagements ? <span>{a.engagements} reviewed</span> : null}
                                  {a.location ? <span>{a.location}</span> : null}
                                </div>
                              ) : null}
                            </div>
                          </button>
                          <button type="button" className="tb-btn primary" onClick={() => actions.selectAnalyst(a.id)}>Send offer</button>
                        </div>
                      ))}
                    </div>
                  ) : analyst && job ? (
                    <div className="tb-connect-card">
                      <div className="tb-connect-row">
                        <div className="party">
                          <span className="tb-tile" style={{ background: '#1c1c1a' }}>MP</span>
                          <div><strong>{firm.firmName}</strong><span>{firm.contact}</span></div>
                        </div>
                        <div className="tb-connect-bridge">
                          <span className="line" />
                          <span className="badge">
                            {job.status === 'offered' ? 'Offer pending'
                              : job.status === 'in_progress' ? 'Connected'
                                : job.status === 'submitted' ? 'Draft in'
                                  : 'Closed'}
                          </span>
                          <span className="line" />
                        </div>
                        <button type="button" className="party tb-party-btn" onClick={() => openPerson(analyst, 'home')}>
                          <Avatar seed={analyst.id} name={analyst.name} photoUrl={analyst.photoUrl} color={analyst.color} size={36} />
                          <div><strong>{analyst.name}</strong><span>{analyst.school} &rsquo;{analyst.year}</span></div>
                        </button>
                      </div>
                      <p className="tb-connect-note">
                        {job.status === 'offered' && 'Vault locked until they accept. Switch to Worker to accept.'}
                        {job.status === 'in_progress' && `Analyst is working in the Vault — ${progress.approved}/${progress.total} deliverables approved, ${progress.submitted} awaiting your review.`}
                        {job.status === 'submitted' && 'Every deliverable is in. Review each against its acceptance criteria.'}
                        {job.status === 'reviewed' && 'Engagement closed. Sources destroyed under No-Train Lock.'}
                      </p>
                      {vaultOpenable ? (
                        <button type="button" className="tb-btn ghost" onClick={() => openVault()}>
                          <Ic name="vault" size={13} /> Open Vault workspace
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                <section>
                  <div className="tb-section-head">
                    <h2>Deliverables{job ? ` · ${progress.approved}/${progress.total}` : ''}</h2>
                    <button type="button" className="tb-link" onClick={() => setNav('vault')}>Go to vault <Ic name="arrowR" size={12} /></button>
                  </div>
                  {!job ? (
                    <div className="tb-empty compact"><p>Deliverables are scoped when you create a request and land here as the analyst submits them.</p></div>
                  ) : (
                    <div className="tb-deliv-list">
                      {job.deliverables.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          className={`tb-deliv-item${vaultOpenable ? '' : ' muted'}`}
                          onClick={() => vaultOpenable && openVault(d.id)}
                          disabled={!vaultOpenable}
                        >
                          <span className={`tb-dstat ${d.status}`} />
                          <KindBadge kind={d.kind} />
                          <span className="meta">
                            <span className="nm">{d.title}</span>
                            <span className="sb">{DELIVERABLE_STATUS_LABEL[d.status]}{d.version ? ` · v${d.version}` : ''} · due {deliverableDue(job, d)}</span>
                          </span>
                          {d.status === 'submitted' ? <span className="tb-pill green">Review</span> : null}
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="tb-section-head">
                    <h2>Active engagement</h2>
                    <button type="button" className="tb-link" onClick={() => setNav('rooms')}>Deal rooms <Ic name="arrowR" size={12} /></button>
                  </div>
                  {!job ? (
                    <div className="tb-empty compact"><p>No live engagement yet.</p></div>
                  ) : (
                    <div className="tb-card">
                      <div className="head">
                        <span className="tb-tile" style={{ background: job.color }}>{job.tile}</span>
                        <span className="meta">
                          <span className="name">{job.name}</span>
                          <span className="sub">{job.workstream}{job.fileName ? ` · ${job.fileName}` : ''}</span>
                        </span>
                      </div>
                      <div className="badges">
                        <span className={`tb-pill ${job.status === 'reviewed' || job.status === 'submitted' ? 'green' : job.status === 'in_progress' ? 'amber' : ''}`}>
                          {job.status === 'matching' ? 'Matching'
                            : job.status === 'offered' ? 'Offer pending'
                              : job.status === 'in_progress' ? `In progress · ${progress.approved}/${progress.total}`
                                : job.status === 'submitted' ? 'All submitted'
                                  : 'Closed'}
                        </span>
                        {analyst ? <span className="tb-pill">{analyst.name}</span> : null}
                        <span className="tb-pill">{job.files.length} files in Vault</span>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>

            {job && (job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed') ? (
              <div className="tb-session-bar">
                <div className="progress"><div className="fill" style={{ width: `${progress.total ? Math.max(6, Math.round(((progress.approved + progress.submitted * 0.5) / progress.total) * 100)) : 0}%` }} /></div>
                <span className="tb-tile" style={{ background: analyst?.color ?? job.color }}>{analyst?.initials ?? job.tile}</span>
                <span className="meta">
                  <span className="name">{job.name}</span>
                  <span className="sub">{analyst?.name} · {progress.approved}/{progress.total} approved{progress.submitted ? ` · ${progress.submitted} to review` : ''}</span>
                </span>
                <span className="chapter">Vault workspace <Ic name="arrowR" size={11} /></span>
                <span className="spacer" />
                <button type="button" className="tb-session-ctl chip" onClick={() => openVault()}>Open</button>
                <button type="button" className="tb-session-ctl" onClick={() => {/* hide */}}><Ic name="close" size={13} /></button>
              </div>
            ) : null}
          </>
          )
        ) : nav === 'profile' ? (
          <div className="tb-panel-wrap">
            <ProfilePanel user={user} role={role} ndaSignedAt={ndaSignedAt} student={student} onLogout={onLogout} onSite={onSite} onEditProfile={onEditProfile} />
          </div>
        ) : (
          <div className="tb-panel-wrap">
            <CompanyNavPanels
              nav={nav}
              demo={demo}
              firm={firm}
              actions={actions}
              onGoHome={goHome}
              onOpenVault={(id) => openVault(id ?? null)}
              onNewRequest={() => openRequest()}
              onSelectAnalyst={(id) => { actions.selectAnalyst(id); setNav('home'); }}
              onOpenPerson={(a) => openPerson(a, nav)}
            />
          </div>
        )}
        </div>
      </main>

      {showRequest ? (
        <NewRequestModal
          key={requestWorkflow ?? 'default'}
          initialWorkflowId={requestWorkflow}
          onClose={() => { setShowRequest(false); setRequestWorkflow(undefined); }}
          onCreate={(input) => { actions.createRequest(input); setShowRequest(false); setRequestWorkflow(undefined); setNav('home'); }}
        />
      ) : null}

      {viewer.open && job && vaultOpenable ? (
        <VaultWorkspace
          role="company"
          job={job}
          firm={firm}
          analyst={analyst}
          viewerName={firm.contact}
          viewerEmail={firm.email}
          actions={actions}
          onClose={closeVault}
          initialDeliverableId={viewer.deliverableId}
        />
      ) : null}
    </div>
  );
}

// Re-export for older imports
export { RoleToggle } from './TalentNav';
