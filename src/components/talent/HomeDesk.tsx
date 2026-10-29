import React from 'react';
import { BENCH, TalentFirm, WORKFLOWS } from './demoStore';
import { Avatar, OrgMark } from './PersonProfile';
import type { StudentSession } from './session';
import { Ic } from './TalentNav';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Company home when there's no active engagement. */
export function CompanyHomeDesk({
  firm,
  contactName,
  onNewRequest,
  onPickWorkflow,
  onOpenBench,
}: {
  firm: TalentFirm;
  contactName: string;
  onNewRequest: () => void;
  onPickWorkflow: (workflowId: string) => void;
  onOpenBench: () => void;
}) {
  const first = contactName.split(/\s+/)[0] || contactName;

  return (
    <div className="tb-desk">
      <header className="tb-desk-hero">
        <div className="tb-desk-kicker">
          <span className="dot live" />
          Desk clear · ready to staff
        </div>
        <h1>{greeting()}, {first}.</h1>
        <p>
          Open a deal room, drop source files under No-Train Lock, and get three cleared
          analysts matched on skill. One offer. Vault unlocks when they accept.
        </p>
        <div className="tb-desk-hero-meta">
          <span><OrgMark org={firm.firmName} size={16} />{firm.firmName}</span>
          <span className="sep" />
          <span>{firm.firmType || 'Advisory'}</span>
          <span className="sep" />
          <span className="ok"><Ic name="shield" size={12} /> NDA on file · No-Train Lock</span>
        </div>
        <div className="tb-desk-cta">
          <button type="button" className="tb-btn primary" onClick={onNewRequest}>
            <Ic name="plus" size={13} /> New request
          </button>
          <button type="button" className="tb-btn ghost" onClick={onOpenBench}>
            Browse talent bench
          </button>
        </div>
      </header>

      <section className="tb-desk-sec">
        <div className="tb-desk-sec-head">
          <h2>Start from a workflow</h2>
          <span>Pre-scopes deliverables, due dates, and firm inputs</span>
        </div>
        <div className="tb-desk-wf">
          {WORKFLOWS.map((w) => (
            <button key={w.id} type="button" className="tb-desk-wf-card" onClick={() => onPickWorkflow(w.id)}>
              <strong>{w.label}</strong>
              <span>{w.short}</span>
              <em>{w.turnaround} · {w.deliverables.length} deliverables</em>
            </button>
          ))}
        </div>
      </section>

      <div className="tb-desk-cols">
        <section className="tb-desk-sec">
          <div className="tb-desk-sec-head">
            <h2>How staffing runs</h2>
          </div>
          <ol className="tb-desk-steps">
            <li>
              <span className="n">1</span>
              <div>
                <strong>Scope the request</strong>
                <p>Pick a workflow, upload firm materials, set clearance and export policy.</p>
              </div>
            </li>
            <li>
              <span className="n">2</span>
              <div>
                <strong>Match &amp; offer</strong>
                <p>Three cleared analysts surface. Send one offer — files stay locked until accept.</p>
              </div>
            </li>
            <li>
              <span className="n">3</span>
              <div>
                <strong>Review in the Vault</strong>
                <p>Deliverables land one by one. Approve or request changes against acceptance criteria.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="tb-desk-sec">
          <div className="tb-desk-sec-head">
            <h2>On the bench now</h2>
            <button type="button" className="tb-link" onClick={onOpenBench}>View all <Ic name="arrowR" size={12} /></button>
          </div>
          <ul className="tb-desk-bench">
            {BENCH.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Avatar seed={a.id} name={a.name} photoUrl={a.photoUrl} color={a.color} size={32} />
                <div className="meta">
                  <strong>{a.name}</strong>
                  <span>{a.school} &rsquo;{a.year} · {a.focus}</span>
                </div>
                <em>{a.score}%</em>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

/** Worker home when there's no offer / engagement yet. */
export function WorkerHomeDesk({
  name,
  schoolLabel,
  student,
  matching,
  onEditProfile,
  onSwitchCompany,
}: {
  name: string;
  schoolLabel: string;
  student?: StudentSession | null;
  matching?: boolean;
  onEditProfile?: () => void;
  onSwitchCompany: () => void;
}) {
  const first = name.split(/\s+/)[0] || name;
  const standing = student?.standing;
  const streams = student?.profile.workstreams ?? [];
  const tools = student?.profile.tools?.slice(0, 4) ?? [];

  return (
    <div className="tb-desk">
      <header className="tb-desk-hero">
        <div className="tb-desk-kicker">
          <span className={`dot${matching ? ' wait' : ' live'}`} />
          {matching ? 'Firm is matching · stay ready' : 'Live on the bench · waiting for offers'}
        </div>
        <h1>{greeting()}, {first}.</h1>
        <p>
          {matching
            ? 'A firm locked a request and is picking from the matched bench. If they send you the offer, it lands here with the brief and Vault unlock.'
            : 'Your desk is clear. When a firm selects you, the offer shows the engagement, deliverables, and terms — accept to unlock the Vault.'}
        </p>
        <div className="tb-desk-hero-meta">
          <span><OrgMark org={schoolLabel} size={16} />{schoolLabel}</span>
          {standing ? (
            <>
              <span className="sep" />
              <span className="ok">Standing {standing.score}</span>
              <span className="sep" />
              <span>{standing.engagementsCompleted} reviewed · {standing.responseRate}% response</span>
            </>
          ) : (
            <>
              <span className="sep" />
              <span className="ok">.edu verified · vault-trained</span>
            </>
          )}
        </div>
        <div className="tb-desk-cta">
          {onEditProfile ? (
            <button type="button" className="tb-btn primary" onClick={onEditProfile}>Edit profile</button>
          ) : null}
          <button type="button" className="tb-btn ghost" onClick={onSwitchCompany}>
            Preview firm view
          </button>
        </div>
      </header>

      <div className="tb-desk-cols">
        <section className="tb-desk-sec">
          <div className="tb-desk-sec-head">
            <h2>What happens next</h2>
          </div>
          <ol className="tb-desk-steps">
            <li className={matching ? 'on' : ''}>
              <span className="n">1</span>
              <div>
                <strong>Firm scopes a request</strong>
                <p>Workflow, source files, and access policy land in a locked Vault.</p>
              </div>
            </li>
            <li className={matching ? 'on' : ''}>
              <span className="n">2</span>
              <div>
                <strong>You’re matched</strong>
                <p>Up to three cleared analysts. The firm sends one offer — not a bidding board.</p>
              </div>
            </li>
            <li>
              <span className="n">3</span>
              <div>
                <strong>Accept → deliver → get paid</strong>
                <p>Vault unlocks watermarked. Submit per deliverable. Paid after firm approval.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="tb-desk-sec">
          <div className="tb-desk-sec-head">
            <h2>How firms see you</h2>
            {onEditProfile ? (
              <button type="button" className="tb-link" onClick={onEditProfile}>Edit <Ic name="arrowR" size={12} /></button>
            ) : null}
          </div>
          <div className="tb-desk-you">
            <Avatar seed={student?.email || name} name={name} photoUrl={student?.profile.photoUrl} size={44} />
            <div className="meta">
              <strong>{name}</strong>
              <span>{student?.profile.headline || `${schoolLabel} · cleared analyst`}</span>
            </div>
          </div>
          {streams.length || tools.length ? (
            <div className="tb-desk-chips">
              {streams.slice(0, 4).map((w) => <span key={w}>{w}</span>)}
              {tools.map((t) => <span key={t} className="mute">{t}</span>)}
            </div>
          ) : (
            <p className="tb-desk-hint">Finish your profile so matching can weight your workstreams and tools.</p>
          )}
          {standing ? (
            <div className="tb-desk-standing">
              <div><em>Standing</em><strong>{standing.score}</strong></div>
              <div><em>On-time</em><strong>{standing.onTimeRate}%</strong></div>
              <div><em>Response</em><strong>{standing.responseRate}%</strong></div>
              <div>
                <em>Re-verify</em>
                <strong>
                  {new Date(standing.nextReverifyAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                </strong>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <p className="tb-desk-foot">
        Demo tip — switch to Company, create a request, and send yourself an offer to walk the full loop.
      </p>
    </div>
  );
}
