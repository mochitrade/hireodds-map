import React, { useEffect, useRef, useState } from 'react';
import {
  Analyst,
  DELIVERABLE_STATUS_LABEL,
  Deliverable,
  FileKind,
  Job,
  TalentFirm,
  deliverableDue,
} from './demoStore';
import { Avatar } from './PersonProfile';

function KindBadge({ kind }: { kind: FileKind }) {
  return <span className={`tb-kind tb-kind-${kind}`}>{kind === 'memo' ? 'MEMO' : kind.toUpperCase()}</span>;
}

function CalIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.2" />
      <path d="M2.5 6.5h11M5.5 2v2.5M10.5 2v2.5" />
    </svg>
  );
}

/* ---------- Messages — real chat layout ---------- */

export interface ChatMessage {
  id: string;
  who: 'me' | 'them' | 'system';
  name: string;
  text: string;
  at: string;
  seed: string;
  photoUrl?: string;
  color?: string;
}

function seedThread(opts: {
  connected: boolean;
  meName: string;
  meSeed: string;
  mePhoto?: string;
  themName: string;
  themSeed: string;
  themPhoto?: string;
  themColor?: string;
  jobName?: string;
}): ChatMessage[] {
  if (!opts.connected) {
    return [
      {
        id: 's0',
        who: 'system',
        name: 'System',
        text: 'This channel unlocks once you’re connected on an engagement.',
        at: '',
        seed: 'system',
      },
    ];
  }
  const j = opts.jobName || 'the engagement';
  return [
    {
      id: 's1',
      who: 'system',
      name: 'System',
      text: `Secure channel opened for ${j}. Files stay in the Vault — don’t paste MNPI here.`,
      at: 'Yesterday',
      seed: 'system',
    },
    {
      id: 't1',
      who: 'them',
      name: opts.themName,
      text: `Hi — thanks for connecting on ${j}. I’ve dropped the source files in Firm materials. Flag anything unclear before you start the first deliverable.`,
      at: 'Yesterday · 6:14 PM',
      seed: opts.themSeed,
      photoUrl: opts.themPhoto,
      color: opts.themColor,
    },
    {
      id: 'm1',
      who: 'me',
      name: opts.meName,
      text: 'Got it. I’ll work from the LBO and assumptions memo — should have the error log and audit memo in tonight.',
      at: 'Yesterday · 6:22 PM',
      seed: opts.meSeed,
      photoUrl: opts.mePhoto,
    },
    {
      id: 't2',
      who: 'them',
      name: opts.themName,
      text: 'Perfect. Prefer LTM on the comps page, and call out any circularity in the note. Ping here if you need another source file.',
      at: 'Yesterday · 6:25 PM',
      seed: opts.themSeed,
      photoUrl: opts.themPhoto,
      color: opts.themColor,
    },
  ];
}

export function MessagesPanel({
  role,
  connected,
  firm,
  analyst,
  jobName,
  meName,
  meSeed,
  mePhoto,
  onOpenProfile,
}: {
  role: 'company' | 'worker';
  connected: boolean;
  firm: TalentFirm;
  analyst: Analyst | null;
  jobName?: string;
  meName: string;
  meSeed: string;
  mePhoto?: string;
  onOpenProfile?: (a: Analyst) => void;
}) {
  const themName = role === 'company' ? (analyst?.name ?? 'Analyst') : firm.contact;
  const themSeed = role === 'company' ? (analyst?.id ?? 'analyst') : `firm-${firm.email}`;
  const themPhoto = role === 'company' ? analyst?.photoUrl : undefined;
  const themColor = role === 'company' ? analyst?.color : '#1c1c1a';
  const themSub = role === 'company'
    ? (analyst ? `${analyst.school} ’${analyst.year} · ${jobName || 'Engagement'}` : 'Not connected')
    : `${firm.firmName} · ${jobName || 'Engagement'}`;

  const [msgs, setMsgs] = useState<ChatMessage[]>(() =>
    seedThread({
      connected,
      meName,
      meSeed,
      mePhoto,
      themName,
      themSeed,
      themPhoto,
      themColor,
      jobName,
    }),
  );
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const connectedKey = `${connected}:${analyst?.id ?? ''}:${jobName ?? ''}`;

  useEffect(() => {
    setMsgs(
      seedThread({
        connected,
        meName,
        meSeed,
        mePhoto,
        themName,
        themSeed,
        themPhoto,
        themColor,
        jobName,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedKey]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() || !connected) return;
    const text = draft.trim();
    setDraft('');
    setMsgs((m) => [
      ...m,
      {
        id: `m-${Date.now()}`,
        who: 'me',
        name: meName,
        text,
        at: 'Just now',
        seed: meSeed,
        photoUrl: mePhoto,
      },
    ]);
    window.setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          id: `t-${Date.now()}`,
          who: 'them',
          name: themName,
          text:
            role === 'company'
              ? 'Noted — updating in the Vault now. I’ll flag any data gaps inline on the deliverable.'
              : 'Thanks — leave comments inline in the Vault if anything needs a re-cut.',
          at: 'Just now',
          seed: themSeed,
          photoUrl: themPhoto,
          color: themColor,
        },
      ]);
    }, 800);
  }

  const preview = msgs.filter((m) => m.who !== 'system').slice(-1)[0]?.text || 'No messages yet';

  return (
    <div className="tb-panel">
      <div className="tb-panel-head">
        <div>
          <h2>Messages</h2>
          <p>{connected ? 'Engagement-scoped channel · no MNPI paste' : 'Connect on an engagement to open a secure channel.'}</p>
        </div>
      </div>

      {!connected ? (
        <div className="tb-empty">
          <h3>No active channel</h3>
          <p>
            {role === 'company'
              ? 'Messages open after you send an offer and the analyst accepts.'
              : 'Accept a firm offer to message them here.'}
          </p>
        </div>
      ) : (
        <div className="tb-chat">
          <aside className="tb-chat-threads">
            <div className="tb-chat-threads-head">Inbox</div>
            <button type="button" className="tb-chat-thread on">
              <Avatar seed={themSeed} name={themName} photoUrl={themPhoto} color={themColor} size={36} />
              <span className="meta">
                <span className="nm">{themName}</span>
                <span className="pv">{preview}</span>
              </span>
            </button>
          </aside>

          <div className="tb-chat-main">
            <header className="tb-chat-head">
              <button
                type="button"
                className="tb-chat-person"
                onClick={() => {
                  if (role === 'company' && analyst && onOpenProfile) onOpenProfile(analyst);
                }}
                disabled={!(role === 'company' && analyst && onOpenProfile)}
              >
                <Avatar seed={themSeed} name={themName} photoUrl={themPhoto} color={themColor} size={34} />
                <span>
                  <strong>{themName}</strong>
                  <em>{themSub}</em>
                </span>
              </button>
              {jobName ? <span className="tb-pill">{jobName}</span> : null}
            </header>

            <div className="tb-chat-list" ref={listRef}>
              {msgs.map((m) => {
                if (m.who === 'system') {
                  return (
                    <div key={m.id} className="tb-chat-sys">
                      <span>{m.text}</span>
                    </div>
                  );
                }
                const mine = m.who === 'me';
                return (
                  <div key={m.id} className={`tb-chat-row${mine ? ' mine' : ''}`}>
                    {!mine ? (
                      <Avatar seed={m.seed} name={m.name} photoUrl={m.photoUrl} color={m.color} size={28} />
                    ) : (
                      <span className="tb-chat-spacer" />
                    )}
                    <div className={`tb-chat-bubble${mine ? ' mine' : ''}`}>
                      {!mine ? <div className="who">{m.name}</div> : null}
                      <p>{m.text}</p>
                      <time>{m.at}</time>
                    </div>
                    {mine ? (
                      <Avatar seed={m.seed} name={m.name} photoUrl={m.photoUrl} size={28} />
                    ) : (
                      <span className="tb-chat-spacer" />
                    )}
                  </div>
                );
              })}
            </div>

            <form className="tb-chat-compose" onSubmit={send}>
              <input
                placeholder={`Message ${themName.split(' ')[0]}…`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!connected}
              />
              <button type="submit" className="tb-btn primary" disabled={!connected || !draft.trim()}>
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Deadlines — Linear-style issue list ---------- */

type DueBucket = 'overdue' | 'today' | 'week' | 'later' | 'done';

function parseDue(job: Job, d: Deliverable): Date {
  const base = job.deadline ? new Date(`${job.deadline}T17:00:00`) : new Date();
  const due = new Date(base);
  due.setDate(due.getDate() - (d.dueOffsetDays || 0));
  return due;
}

function bucketOf(job: Job, d: Deliverable, now: Date): DueBucket {
  if (d.status === 'approved') return 'done';
  const due = parseDue(job, d);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const endToday = new Date(start);
  endToday.setHours(23, 59, 59, 999);
  const endWeek = new Date(start);
  endWeek.setDate(endWeek.getDate() + 7);
  if (due < start) return 'overdue';
  if (due <= endToday) return 'today';
  if (due <= endWeek) return 'week';
  return 'later';
}

const BUCKET_META: Record<DueBucket, { label: string; tone: string }> = {
  overdue: { label: 'Overdue', tone: 'danger' },
  today: { label: 'Due today', tone: 'warn' },
  week: { label: 'This week', tone: 'ok' },
  later: { label: 'Later', tone: 'mute' },
  done: { label: 'Done', tone: 'done' },
};

function statusIcon(status: Deliverable['status']) {
  if (status === 'approved') {
    return (
      <span className="tb-lin-ico done" title="Approved">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="6" fill="currentColor" opacity="0.15" />
          <path d="m5 8.2 2.1 2.1 4-4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === 'submitted') {
    return (
      <span className="tb-lin-ico review" title="In review">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" strokeDasharray="3 2" />
        </svg>
      </span>
    );
  }
  if (status === 'changes') {
    return (
      <span className="tb-lin-ico changes" title="Changes requested">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 5v3.2M8 10.6h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="tb-lin-ico todo" title="Open">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </span>
  );
}

function statusLabel(status: Deliverable['status'], locked?: boolean) {
  if (locked) return 'Pending accept';
  if (status === 'approved') return 'Done';
  if (status === 'submitted') return 'In review';
  if (status === 'changes') return 'Revising';
  return 'Todo';
}

export function DeadlinesPanel({
  job,
  firmName,
  locked,
  emptyCopy,
  onOpen,
}: {
  job: Job | null;
  firmName?: string;
  locked?: boolean;
  emptyCopy: string;
  onOpen?: (deliverableId: string) => void;
}) {
  const now = new Date();

  if (!job) {
    return (
      <div className="tb-panel">
        <div className="tb-panel-head">
          <div>
            <h2>Deadlines</h2>
            <p>Per-deliverable milestones across deal rooms.</p>
          </div>
        </div>
        <div className="tb-empty compact"><p>{emptyCopy}</p></div>
      </div>
    );
  }

  const items = job.deliverables.map((d, i) => {
    const b = locked && d.status !== 'approved' ? ('later' as DueBucket) : bucketOf(job, d, now);
    return {
      d,
      i,
      bucket: b,
      id: `${job.tile}-${i + 1}`,
      dueLabel: deliverableDue(job, d),
      due: parseDue(job, d),
    };
  }).sort((a, b) => {
    const order: DueBucket[] = ['overdue', 'today', 'week', 'later', 'done'];
    const diff = order.indexOf(a.bucket) - order.indexOf(b.bucket);
    if (diff !== 0) return diff;
    return a.due.getTime() - b.due.getTime();
  });

  const groups = (['overdue', 'today', 'week', 'later', 'done'] as DueBucket[])
    .map((b) => ({ bucket: b, rows: items.filter((x) => x.bucket === b) }))
    .filter((g) => g.rows.length > 0);

  const openCount = job.deliverables.filter((d) => d.status !== 'approved').length;

  return (
    <div className="tb-panel">
      <div className="tb-panel-head">
        <div>
          <h2>Deadlines</h2>
          <p>{openCount} open · {job.name}{firmName ? ` · ${firmName}` : ''}</p>
        </div>
      </div>

      <div className="tb-lin">
        <div className="tb-lin-bar">
          <span className="tb-lin-filter on">All</span>
          <span className="tb-lin-filter">Active</span>
          <span className="tb-lin-filter">Done</span>
          <span className="tb-lin-count">{job.deliverables.length}</span>
        </div>

        {groups.map((g) => (
          <div key={g.bucket} className="tb-lin-group">
            <div className={`tb-lin-group-head ${BUCKET_META[g.bucket].tone}`}>
              <span className="dot" />
              {BUCKET_META[g.bucket].label}
              <em>{g.rows.length}</em>
            </div>
            <ul className="tb-lin-list">
              {g.rows.map((row) => {
                const clickable = !!onOpen && !locked;
                const Inner = (
                  <>
                    {statusIcon(row.d.status)}
                    <span className="tb-lin-id">{row.id}</span>
                    <KindBadge kind={row.d.kind} />
                    <span className="tb-lin-title">{row.d.title}</span>
                    <span className={`tb-lin-status ${row.d.status}`}>
                      {statusLabel(row.d.status, locked)}
                    </span>
                    <span className="tb-lin-project">{job.name}</span>
                    <span className={`tb-lin-due${g.bucket === 'overdue' ? ' late' : ''}`}>
                      <CalIcon />
                      {row.dueLabel}
                    </span>
                  </>
                );
                return (
                  <li key={row.d.id}>
                    {clickable ? (
                      <button type="button" className="tb-lin-row" onClick={() => onOpen?.(row.d.id)}>
                        {Inner}
                      </button>
                    ) : (
                      <div className="tb-lin-row muted">{Inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <p className="tb-lin-foot">
          Final engagement deadline {job.deadline || '—'} · {DELIVERABLE_STATUS_LABEL.todo} items pull standing down if missed.
        </p>
      </div>
    </div>
  );
}
