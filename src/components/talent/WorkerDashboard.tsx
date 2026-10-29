import React, { useState } from 'react';
import { PipelineBar } from './TalentDashboard';
import {
  DELIVERABLE_STATUS_LABEL,
  DemoActions,
  DemoState,
  RoleMode,
  TalentFirm,
  coachFor,
  deliverableDue,
  deliverableProgress,
  selectedAnalyst,
} from './demoStore';
import {
  AppSidebar,
  Ic,
  KindBadge,
  NavId,
  ProfilePanel,
  ShellUser,
  WorkerNavPanels,
} from './TalentNav';
import { WorkerHomeDesk } from './HomeDesk';
import VaultWorkspace from './VaultWorkspace';

/** The signed-in analyst as seen in the Worker view. */
export interface WorkerIdentity {
  name: string;
  email: string;
  schoolLabel: string; // e.g. "Wharton ’26"
}

interface Props {
  firm: TalentFirm;
  worker: WorkerIdentity;
  role: RoleMode;
  onRoleChange: (role: RoleMode) => void;
  demo: DemoState;
  actions: DemoActions;
  user: ShellUser;
  student?: import('./session').StudentSession | null;
  onHelp: () => void;
  onLogout: () => void;
  onSite: () => void;
  onEditProfile?: () => void;
}

export default function WorkerDashboard({ firm, worker, role, onRoleChange, demo, actions, user, student, onHelp, onLogout, onSite, onEditProfile }: Props) {
  const [nav, setNav] = useState<NavId>('home');
  const [viewer, setViewer] = useState<{ open: boolean; deliverableId: string | null }>({ open: false, deliverableId: null });
  const progress = deliverableProgress(demo.job);

  const coach = coachFor(demo.step, 'worker');
  const empty = demo.step === 'empty' || demo.step === 'matching';
  const job = demo.job;
  const analyst = selectedAnalyst(job);
  const hasOffer = demo.step === 'offer_sent' && !!job;
  const connected = !!(job && (job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed'));
  const liveCount = job?.status === 'in_progress' ? 1 : 0;

  // In the Worker view, "you" are the analyst the firm connected with (or the signed-in student before any match).
  const meName = analyst?.name ?? worker.name;
  const meSchool = analyst ? `${analyst.school} ’${analyst.year}` : worker.schoolLabel;
  const meInitials = analyst?.initials ?? user.initials;
  const meColor = analyst?.color ?? '#1e3a6e';

  function goHome() { setNav('home'); }
  function openVault(deliverableId: string | null = null) { setViewer({ open: true, deliverableId }); }
  function closeVault() { setViewer({ open: false, deliverableId: null }); }

  function onCoachCta() {
    if (!coach) return;
    if (coach.targetRole) onRoleChange(coach.targetRole);
    else if (coach.primaryAction === 'accept_offer') actions.acceptOffer();
    else if (coach.primaryAction === 'open_vault') openVault();
    else if (coach.primaryAction === 'reset') actions.reset();
  }

  return (
    <div className="tb-app">
      <AppSidebar
        role={role}
        onRoleChange={onRoleChange}
        nav={nav}
        onNav={setNav}
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
              {nav === 'home' ? 'Home'
                : nav === 'rooms' ? 'My queue'
                  : nav === 'search' ? 'Search'
                    : nav === 'bench' ? 'Active sessions'
                      : nav === 'messages' ? 'Messages'
                        : nav === 'saved' ? 'Saved'
                          : nav === 'deadlines' ? 'Deadlines'
                            : nav === 'vault' ? 'Secure vault'
                              : nav === 'profile' ? 'Profile'
                                : 'Home'}
            </strong>
          </div>
          <div className="right">
            <span className="tb-lock-chip"><Ic name="shield" size={13} /> Secure interface · NDA active</span>
            <span className="tb-worker-chip">{meName} · {meSchool}</span>
          </div>
        </div>

        <div className="tb-stage">
        {nav === 'home' ? (
          empty && !hasOffer ? (
            <div className="tb-panel-wrap">
              <WorkerHomeDesk
                name={meName}
                schoolLabel={meSchool}
                student={student}
                matching={demo.step === 'matching'}
                onEditProfile={onEditProfile}
                onSwitchCompany={() => onRoleChange('company')}
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
                    {demo.workerFeed.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="tb-feed-item"
                        onClick={() => {
                          if (hasOffer) actions.acceptOffer();
                          else if (connected) openVault();
                        }}
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
                    <h2>{hasOffer ? 'Engagement offer' : connected ? 'Connected engagement' : 'My assignments'}</h2>
                    <button type="button" className="tb-link" onClick={() => setNav('rooms')}>My queue <Ic name="arrowR" size={12} /></button>
                  </div>

                  {hasOffer && job ? (
                    <div className="tb-offer-card">
                      <div className="tb-offer-head">
                        <span className="tb-tile" style={{ background: '#1c1c1a' }}>MP</span>
                        <div>
                          <strong>{firm.firmName}</strong>
                          <span>{firm.contact} · {firm.firmType}</span>
                        </div>
                        <span className="tb-pill amber">Offer</span>
                      </div>
                      <h3>{job.name}</h3>
                      <p className="workstream">{job.workstream}{job.deadline ? ` · due ${job.deadline}` : ''} · {job.deliverables.length} deliverables · {job.files.length} source files</p>
                      <p className="brief">{job.notes}</p>
                      <ul className="tb-offer-deliv">
                        {job.deliverables.map((d) => (
                          <li key={d.id}><KindBadge kind={d.kind} /><span>{d.title}</span><em>due {deliverableDue(job, d)}</em></li>
                        ))}
                      </ul>
                      <ul className="tb-offer-terms">
                        <li>Mutual NDA already on file with the firm</li>
                        <li>Files unlock only after you accept — Vault only, no download</li>
                        <li>Paid after the firm approves every deliverable</li>
                      </ul>
                      <div className="tb-offer-actions">
                        <button type="button" className="tb-btn primary" onClick={() => actions.acceptOffer()}>
                          <Ic name="check" size={13} /> Accept &amp; unlock Vault
                        </button>
                        <button type="button" className="tb-btn ghost" onClick={() => onRoleChange('company')}>
                          Decline (return to bench)
                        </button>
                      </div>
                    </div>
                  ) : connected && job ? (
                    <div className="tb-card" style={{ cursor: 'default' }}>
                      <div className="head">
                        <span className="tb-tile" style={{ background: job.color }}>{job.tile}</span>
                        <span className="meta">
                          <span className="name">{job.name}</span>
                          <span className="sub">
                            {firm.firmName} · {progress.approved}/{progress.total} approved
                            {progress.changes ? ` · ${progress.changes} to revise` : ''}
                          </span>
                        </span>
                      </div>
                      <div className="tb-deliv-list" style={{ marginTop: 10 }}>
                        {job.deliverables.map((d) => (
                          <button key={d.id} type="button" className="tb-deliv-item" onClick={() => openVault(d.id)}>
                            <span className={`tb-dstat ${d.status}`} />
                            <KindBadge kind={d.kind} />
                            <span className="meta">
                              <span className="nm">{d.title}</span>
                              <span className="sb">{DELIVERABLE_STATUS_LABEL[d.status]}{d.version ? ` · v${d.version}` : ''} · due {deliverableDue(job, d)}</span>
                            </span>
                            {d.status === 'changes' ? <span className="tb-pill amber">Revise</span> : d.status === 'todo' ? <span className="tb-pill">Submit</span> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                <section>
                  <div className="tb-section-head">
                    <h2>Connection</h2>
                    <button type="button" className="tb-link" onClick={() => setNav('messages')}>Messages <Ic name="arrowR" size={12} /></button>
                  </div>
                  {hasOffer || connected ? (
                    <div className="tb-connect-card">
                      <div className="tb-connect-row">
                        <div className="party">
                          <span className="tb-tile" style={{ background: '#1c1c1a' }}>MP</span>
                          <div><strong>{firm.firmName}</strong><span>{firm.contact}</span></div>
                        </div>
                        <div className="tb-connect-bridge">
                          <span className="line" />
                          <span className="badge">{hasOffer ? 'Offer' : job?.status === 'reviewed' ? 'Closed' : 'Connected'}</span>
                          <span className="line" />
                        </div>
                        <div className="party">
                          <span className="tb-tile" style={{ background: meColor }}>{meInitials}</span>
                          <div><strong>{meName}</strong><span>{meSchool}</span></div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>

                <section>
                  <div className="tb-section-head">
                    <h2>Continue working</h2>
                    <button type="button" className="tb-link" onClick={() => setNav('vault')}>Vault <Ic name="arrowR" size={12} /></button>
                  </div>
                  {connected && job?.status === 'in_progress' ? (
                    <div className="tb-mini-card">
                      <span className="tb-tile" style={{ background: job.color }}>{job.tile}</span>
                      <span className="meta">
                        <span className="name">{job.name}</span>
                        <span className="sub">{job.files.length} files in Vault · {progress.total - progress.approved - progress.submitted} deliverables open</span>
                      </span>
                      <button type="button" className="tb-play-btn" onClick={() => openVault()}>
                        <Ic name="play" size={11} />
                      </button>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>

            {connected && job?.status === 'in_progress' ? (
              <div className="tb-session-bar">
                <div className="progress"><div className="fill" style={{ width: `${progress.total ? Math.max(6, Math.round(((progress.approved + progress.submitted) / progress.total) * 100)) : 0}%` }} /></div>
                <span className="tb-tile" style={{ background: job.color }}>{job.tile}</span>
                <span className="meta">
                  <span className="name">{job.name}</span>
                  <span className="sub">{firm.firmName} · {progress.approved + progress.submitted}/{progress.total} submitted</span>
                </span>
                <span className="chapter">Vault workspace <Ic name="arrowR" size={11} /></span>
                <span className="spacer" />
                <button type="button" className="tb-session-ctl chip" onClick={() => openVault()}>Vault</button>
                <button type="button" className="tb-session-ctl"><Ic name="close" size={13} /></button>
              </div>
            ) : null}
          </>
          )
        ) : nav === 'profile' ? (
          <div className="tb-panel-wrap">
            <ProfilePanel user={user} role={role} ndaSignedAt={null} student={student} onLogout={onLogout} onSite={onSite} onEditProfile={onEditProfile} />
          </div>
        ) : (
          <div className="tb-panel-wrap">
            <WorkerNavPanels
              nav={nav}
              demo={demo}
              firm={firm}
              actions={actions}
              onGoHome={goHome}
              onOpenVault={(id) => openVault(id ?? null)}
            />
          </div>
        )}
        </div>
      </main>

      {viewer.open && job && connected ? (
        <VaultWorkspace
          role="worker"
          job={job}
          firm={firm}
          analyst={analyst}
          viewerName={meName}
          viewerEmail={worker.email}
          actions={actions}
          onClose={closeVault}
          initialDeliverableId={viewer.deliverableId}
        />
      ) : null}
    </div>
  );
}
