import React, { useEffect, useMemo, useState } from 'react';
import {
  Analyst,
  CLEARANCE_LABEL,
  DELIVERABLE_STATUS_LABEL,
  Deliverable,
  DemoActions,
  FileKind,
  Job,
  RoleMode,
  TalentFirm,
  VaultFile,
  VaultFolder,
  deliverableDue,
  deliverableProgress,
  fileExt,
  workflowById,
} from './demoStore';
import { Ic, KindBadge } from './TalentNav';
import { TbSelect } from './Select';

type Selection =
  | { type: 'deliverable'; id: string }
  | { type: 'file'; id: string }
  | { type: 'brief' };

interface Props {
  role: RoleMode;
  job: Job;
  firm: TalentFirm;
  analyst: Analyst | null;
  viewerName: string;
  viewerEmail: string;
  actions: DemoActions;
  onClose: () => void;
  initialDeliverableId?: string | null;
}

const FOLDER_LABEL: Record<VaultFolder, string> = {
  firm: 'Firm materials',
  working: 'Working files',
  deliverable: 'Submitted deliverables',
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function defaultNoteFor(d: Deliverable, job: Job): string {
  switch (d.kind) {
    case 'xlsx': return `${d.title}: built off the firm files in the Vault, every figure footnoted to source. Codenames only. Two open items flagged in the notes column for the deal team.`;
    case 'pptx': return `${d.title}: template-compliant, page numbers consistent, speaker notes filled. Codenames only — see change log on the last slide.`;
    case 'docx':
    case 'pdf': return `${d.title}: drafted from the management materials in the Vault. Figures reconcile to the financials file. Open questions for management are highlighted.`;
    default: return `${d.title} for ${job.name}: summary of findings, what moved, and what to re-verify before it goes to the client.`;
  }
}

export default function VaultWorkspace({ role, job, firm, analyst, viewerName, viewerEmail, actions, onClose, initialDeliverableId }: Props) {
  const wf = workflowById(job.workflowId);
  const progress = deliverableProgress(job);
  const canWork = job.status === 'in_progress' || job.status === 'submitted' || job.status === 'reviewed';

  const firstOpen = job.deliverables.find((d) => d.status === 'todo' || d.status === 'changes')
    ?? job.deliverables.find((d) => d.status === 'submitted')
    ?? job.deliverables[0];
  const [sel, setSel] = useState<Selection>(() => {
    if (initialDeliverableId) return { type: 'deliverable', id: initialDeliverableId };
    if (role === 'company' && job.status === 'in_progress' && job.files[0]) return { type: 'file', id: job.files[0].id };
    return firstOpen ? { type: 'deliverable', id: firstOpen.id } : { type: 'brief' };
  });
  const [rightTab, setRightTab] = useState<'activity' | 'brief' | 'policy'>('activity');

  const watermarkSpans = useMemo(
    () => Array.from({ length: 48 }, (_, i) => <span key={i}>{viewerEmail} · {job.name} · no download</span>),
    [viewerEmail, job.name],
  );

  const selFile = sel.type === 'file' ? job.files.find((f) => f.id === sel.id) ?? null : null;
  const selDeliv = sel.type === 'deliverable' ? job.deliverables.find((d) => d.id === sel.id) ?? null : null;

  useEffect(() => {
    if (selFile) actions.logView(viewerName, selFile.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selFile?.id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const byFolder = (f: VaultFolder) => job.files.filter((x) => x.folder === f);

  function uploadTo(folder: VaultFolder) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.pdf,.pptx,.xlsx,.docx,.csv';
    input.onchange = () => {
      Array.from(input.files ?? []).forEach((f) => actions.addVaultFile(folder, { name: f.name, size: f.size }, viewerName));
    };
    input.click();
  }

  function addSample(folder: VaultFolder) {
    const n = byFolder(folder).length + 1;
    const name = folder === 'working'
      ? `${job.name.replace(/\s+/g, '_')}_working_v${n}.xlsx`
      : `${job.name.replace(/\s+/g, '_')}_source_${n}.pdf`;
    actions.addVaultFile(folder, { name, size: 420_000 + n * 180_000 }, viewerName);
  }

  const allApproved = progress.total > 0 && progress.approved === progress.total;

  return (
    <div className="tb-vault-backdrop">
      <div className="tb-vault" onContextMenu={(e) => e.preventDefault()}>
        <header className="tb-vault-top">
          <button type="button" className="tb-vault-close" onClick={onClose} title="Close workspace (Esc)"><Ic name="close" size={14} /></button>
          <span className="tb-tile" style={{ background: job.color }}>{job.tile}</span>
          <div className="tb-vault-title">
            <strong>{job.name}</strong>
            <span>{job.workstream} · {firm.firmName}{analyst ? ` ↔ ${analyst.name}` : ''}</span>
          </div>
          <span className={`tb-pill ${job.status === 'reviewed' ? 'green' : job.status === 'submitted' ? 'green' : 'amber'}`}>
            {job.status === 'in_progress' ? `${progress.approved}/${progress.total} approved`
              : job.status === 'submitted' ? 'All submitted · in review'
                : job.status === 'reviewed' ? 'Closed'
                  : job.status === 'offered' ? 'Offer pending' : 'Matching'}
          </span>
          <div className="tb-vault-policy-chips">
            <span><Ic name="lock" size={11} /> No download</span>
            <span>No clipboard</span>
            <span>Watermarked</span>
            {job.policy.codenamesOnly ? <span>Codenames only</span> : null}
            <span>{CLEARANCE_LABEL[job.policy.clearance]}</span>
          </div>
          <span className="tb-vault-viewer">Viewing as <strong>{role === 'company' ? firm.contact : viewerName}</strong> · {viewerEmail}</span>
        </header>

        <div className="tb-vault-body">
          <aside className="tb-vault-left">
            <div className="tb-vault-sec">
              <div className="hd">
                <span>Deliverables</span>
                <span className="cnt">{progress.approved}/{progress.total}</span>
              </div>
              {job.deliverables.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className={`tb-vault-row${sel.type === 'deliverable' && sel.id === d.id ? ' active' : ''}`}
                  onClick={() => setSel({ type: 'deliverable', id: d.id })}
                >
                  <span className={`tb-dstat ${d.status}`} />
                  <span className="meta">
                    <span className="nm">{d.title}</span>
                    <span className="sb">{DELIVERABLE_STATUS_LABEL[d.status]}{d.version ? ` · v${d.version}` : ''} · due {deliverableDue(job, d)}</span>
                  </span>
                </button>
              ))}
            </div>

            {(['firm', 'working', 'deliverable'] as VaultFolder[]).map((folder) => {
              const files = byFolder(folder);
              const canUpload = canWork && (folder === 'firm' ? role === 'company' : folder === 'working' ? role === 'worker' : false);
              return (
                <div className="tb-vault-sec" key={folder}>
                  <div className="hd">
                    <span>{FOLDER_LABEL[folder]}</span>
                    {canUpload ? (
                      <span className="hd-actions">
                        <button type="button" onClick={() => addSample(folder)} title="Add a sample file (demo)">+ sample</button>
                        <button type="button" onClick={() => uploadTo(folder)} title="Upload from your device">Upload</button>
                      </span>
                    ) : <span className="cnt">{files.length}</span>}
                  </div>
                  {files.length === 0 ? (
                    <div className="tb-vault-empty">
                      {folder === 'firm' ? 'No source files yet.' : folder === 'working' ? 'Analyst scratch files land here.' : 'Submitted versions land here.'}
                    </div>
                  ) : files.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      className={`tb-vault-row${sel.type === 'file' && sel.id === f.id ? ' active' : ''}`}
                      onClick={() => setSel({ type: 'file', id: f.id })}
                    >
                      <KindBadge kind={f.kind} />
                      <span className="meta">
                        <span className="nm">{f.name}</span>
                        <span className="sb">{f.size} · v{f.version} · {f.by}</span>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}

            <button type="button" className={`tb-vault-row brief${sel.type === 'brief' ? ' active' : ''}`} onClick={() => setSel({ type: 'brief' })}>
              <Ic name="notes" size={14} />
              <span className="meta"><span className="nm">Brief & scope</span><span className="sb">{wf.label} · deadline {job.deadline || 'rolling'}</span></span>
            </button>
          </aside>

          <section className="tb-vault-center">
            <div className="tb-viewer-banner" style={{ marginBottom: 0, borderRadius: 0 }}>
              <Ic name="shield" size={13} /> Secure interface
              <span className="sep">|</span> Downloads disabled
              <span className="sep">|</span> Copy disabled
              <span className="sep">|</span> Watermarked for {viewerEmail}
              <span className="sep">|</span> Every open is logged
            </div>

            <div className="tb-vault-scroll">
              {selFile ? (
                <FilePane file={selFile} job={job} watermarks={watermarkSpans} />
              ) : selDeliv ? (
                <DeliverablePane
                  key={`${selDeliv.id}-${selDeliv.version}`}
                  d={selDeliv}
                  job={job}
                  role={role}
                  firm={firm}
                  viewerName={viewerName}
                  actions={actions}
                  watermarks={watermarkSpans}
                  workingFiles={byFolder('working')}
                  onOpenFile={(id) => setSel({ type: 'file', id })}
                />
              ) : (
                <BriefPane job={job} firm={firm} analyst={analyst} />
              )}
            </div>

            {role === 'company' && allApproved && job.status !== 'reviewed' ? (
              <div className="tb-vault-foot">
                <button type="button" className="tb-btn primary" onClick={actions.markReviewed}><Ic name="check" size={13} /> Close engagement</button>
              </div>
            ) : null}
            {role === 'company' && job.status === 'reviewed' ? (
              <div className="tb-vault-foot done">
                <Ic name="check" size={14} /> Engagement closed · sources scheduled for destruction · {analyst?.name ?? 'analyst'} track record +1
              </div>
            ) : null}
          </section>

          <aside className="tb-vault-right">
            <div className="tb-vault-tabs">
              {(['activity', 'brief', 'policy'] as const).map((t) => (
                <button key={t} type="button" className={rightTab === t ? 'active' : ''} onClick={() => setRightTab(t)}>
                  {t === 'activity' ? `Activity · ${job.audit.length}` : t === 'brief' ? 'Brief' : 'Policy'}
                </button>
              ))}
            </div>

            {rightTab === 'activity' ? (
              <ol className="tb-audit">
                {[...job.audit].reverse().map((a) => (
                  <li key={a.id}>
                    <span className="t">{fmtTime(a.at)}</span>
                    <span className="body">
                      <strong>{a.who}</strong> {a.action.toLowerCase()}
                      {a.detail ? <span className="d">{a.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ol>
            ) : rightTab === 'brief' ? (
              <div className="tb-vault-brief">
                <div className="lbl">Scope notes</div>
                <p>{job.notes || 'No notes.'}</p>
                <div className="lbl">Deadline</div>
                <p>{job.deadline ? new Date(`${job.deadline}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Rolling'}</p>
                <div className="lbl">Expected inputs</div>
                <ul>{wf.firmInputs.map((x) => <li key={x}>{x}</li>)}</ul>
                <div className="lbl">Parties</div>
                <p>{firm.firmName} ({firm.contact}){analyst ? ` ↔ ${analyst.name}, ${analyst.school} ’${analyst.year}` : ''}</p>
              </div>
            ) : (
              <div className="tb-vault-brief">
                <div className="lbl">Always on</div>
                <ul>
                  <li>No analyst download, print, or export</li>
                  <li>Clipboard disabled · screenshots watermarked</li>
                  <li>Every open, submit, and review is logged</li>
                  <li>Sources destroyed at close (No-Train Lock)</li>
                </ul>
                <div className="lbl">This engagement</div>
                <ul>
                  <li>Codenames only: <strong>{job.policy.codenamesOnly ? 'required' : 'off'}</strong></li>
                  <li>Clearance: <strong>{CLEARANCE_LABEL[job.policy.clearance]}</strong></li>
                  <li>Firm export: <strong>{job.policy.exportMode === 'none' ? 'Vault only' : 'Redacted PDF'}</strong></li>
                  <li>AI assist: <strong>{job.policy.aiAssist ? 'private endpoints' : 'disabled'}</strong></li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ---------- panes ---------- */

function FilePane({ file, job, watermarks }: { file: VaultFile; job: Job; watermarks: React.ReactNode }) {
  return (
    <div className="tb-vault-pane">
      <div className="tb-vault-pane-head">
        <KindBadge kind={file.kind} />
        <div>
          <h4>{file.name}</h4>
          <span>{FOLDER_LABEL[file.folder]} · {file.size} · v{file.version} · uploaded by {file.by} at {fmtTime(file.at)}</span>
        </div>
      </div>
      <DocPreview kind={file.kind} name={file.name} job={job} watermarks={watermarks} />
    </div>
  );
}

function BriefPane({ job, firm, analyst }: { job: Job; firm: TalentFirm; analyst: Analyst | null }) {
  const wf = workflowById(job.workflowId);
  return (
    <div className="tb-vault-pane">
      <div className="tb-vault-pane-head">
        <span className="tb-tile" style={{ background: job.color, width: 34, height: 34, fontSize: 11 }}>{job.tile}</span>
        <div>
          <h4>{job.name} — brief</h4>
          <span>{wf.label} · {wf.turnaround} typical · {firm.firmName}{analyst ? ` ↔ ${analyst.name}` : ''}</span>
        </div>
      </div>
      <div className="tb-vault-brief big">
        <div className="lbl">Scope</div>
        <p>{job.notes}</p>
        <div className="lbl">Deliverables</div>
        <ul>
          {job.deliverables.map((d) => (
            <li key={d.id}><KindBadge kind={d.kind} /> <strong>{d.title}</strong> — {d.desc} <em>Done when: {d.acceptance}</em></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function DeliverablePane({
  d, job, role, firm, viewerName, actions, watermarks, workingFiles, onOpenFile,
}: {
  d: Deliverable;
  job: Job;
  role: RoleMode;
  firm: TalentFirm;
  viewerName: string;
  actions: DemoActions;
  watermarks: React.ReactNode;
  workingFiles: VaultFile[];
  onOpenFile: (id: string) => void;
}) {
  const nextV = d.version + 1;
  const defaultName = `${job.name.replace(/\s+/g, '_')}_${d.id}_v${nextV}.${fileExt(d.kind)}`;
  const [fileName, setFileName] = useState(defaultName);
  const [note, setNote] = useState(() => defaultNoteFor(d, job));
  const [comment, setComment] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setFileName(`${job.name.replace(/\s+/g, '_')}_${d.id}_v${d.version + 1}.${fileExt(d.kind)}`);
    setNote(defaultNoteFor(d, job));
    setComment('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.id, d.version]);

  const canSubmit = role === 'worker' && (job.status === 'in_progress' || job.status === 'submitted') && (d.status === 'todo' || d.status === 'changes');
  const canReview = role === 'company' && d.status === 'submitted';
  const latestFile = d.fileName ? job.files.find((f) => f.deliverableId === d.id && f.version === d.version) : null;

  return (
    <div className="tb-vault-pane">
      <div className="tb-vault-pane-head">
        <KindBadge kind={d.kind} />
        <div style={{ flex: 1 }}>
          <h4>{d.title}</h4>
          <span>Due {deliverableDue(job, d)} · {d.version ? `v${d.version}` : 'no submission yet'}</span>
        </div>
        <span className={`tb-pill ${d.status === 'approved' || d.status === 'submitted' ? 'green' : d.status === 'changes' ? 'amber' : ''}`}>
          {DELIVERABLE_STATUS_LABEL[d.status]}
        </span>
      </div>

      <div className="tb-deliv-spec">
        <div><span className="k">Scope</span><span>{d.desc}</span></div>
        <div><span className="k">Done when</span><span>{d.acceptance}</span></div>
        {job.policy.codenamesOnly ? <div><span className="k">Policy</span><span>Codenames only — real party names trigger a changes request.</span></div> : null}
      </div>

      {d.status === 'changes' && d.review ? (
        <div className="tb-deliv-callout amber">
          <strong>{firm.contact} requested changes on v{d.version}</strong>
          <span>{d.review.comment || 'See inline comments.'}</span>
        </div>
      ) : null}
      {d.status === 'approved' && d.review ? (
        <div className="tb-deliv-callout green">
          <strong>Approved by {firm.contact}</strong>
          <span>{d.review.comment || 'Meets acceptance criteria.'}</span>
        </div>
      ) : null}

      {d.fileName && d.status !== 'todo' ? (
        <>
          <div className="tb-deliv-sub-head">
            <span>Current submission · v{d.version}</span>
            {latestFile ? <button type="button" className="tb-link" onClick={() => onOpenFile(latestFile.id)}>Open in viewer <Ic name="arrowR" size={11} /></button> : null}
          </div>
          <div className="tb-deliv-note">{d.note}</div>
          <DocPreview kind={d.kind} name={d.fileName} job={job} watermarks={watermarks} compact />
        </>
      ) : null}

      {canSubmit ? (
        <div className="tb-deliv-form">
          <div className="tb-deliv-sub-head"><span>{d.status === 'changes' ? `Resubmit as v${nextV}` : `Submit v${nextV}`}</span></div>
          <div
            className={`tb-dropzone compact${dragOver ? ' drag' : ''}`}
            onClick={() => document.getElementById(`tb-deliv-file-${d.id}`)?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setFileName(f.name); }}
          >
            <div className="big">Drop the {d.kind === 'memo' ? 'memo' : `.${d.kind}`} here or click to choose</div>
            Uploads straight into the Vault — never to your device
            <input id={`tb-deliv-file-${d.id}`} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setFileName(f.name); }} />
          </div>
          <div className="tb-deliv-form-row">
            <div className="tb-field" style={{ margin: 0, flex: 1 }}>
              <label>File name in Vault</label>
              <input value={fileName} onChange={(e) => setFileName(e.target.value)} />
            </div>
            {workingFiles.length ? (
              <div className="tb-field" style={{ margin: 0, flex: 1 }}>
                <label>…or promote a working file</label>
                <TbSelect
                  aria-label="Promote a working file"
                  value=""
                  placeholder="Pick a working file"
                  onChange={(v) => { if (v) setFileName(v); }}
                  options={workingFiles.map((f) => ({ value: f.name, label: f.name }))}
                />
              </div>
            ) : null}
          </div>
          <div className="tb-field" style={{ margin: 0 }}>
            <label>Submission note to {firm.contact}</label>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="tb-deliv-actions">
            <button type="button" className="tb-btn primary" disabled={!fileName.trim()} onClick={() => actions.submitDeliverable(d.id, { fileName: fileName.trim(), note: note.trim() })}>
              <Ic name="check" size={13} /> Submit v{nextV} to {firm.firmName}
            </button>
            <span className="hint">Submitting logs the version and notifies the firm. You can resubmit if they request changes.</span>
          </div>
        </div>
      ) : null}

      {canReview ? (
        <div className="tb-deliv-form">
          <div className="tb-deliv-sub-head"><span>Review v{d.version} against acceptance criteria</span></div>
          <div className="tb-field" style={{ margin: 0 }}>
            <label>Comment to {viewerName === firm.contact ? 'the analyst' : 'analyst'}</label>
            <textarea rows={3} placeholder="e.g. Multiples on rows 4–6 should be LTM, not NTM. Otherwise clean." value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <div className="tb-deliv-actions">
            <button type="button" className="tb-btn primary" onClick={() => actions.reviewDeliverable(d.id, 'approved', comment.trim() || 'Meets acceptance criteria.')}>
              <Ic name="check" size={13} /> Approve
            </button>
            <button type="button" className="tb-btn ghost" onClick={() => actions.reviewDeliverable(d.id, 'changes', comment.trim() || 'Please revise — see acceptance criteria.')}>
              Request changes
            </button>
          </div>
        </div>
      ) : null}

      {role === 'company' && d.status === 'todo' ? (
        <div className="tb-deliv-callout">
          <strong>Waiting on the analyst</strong>
          <span>Nothing submitted yet. You’ll be notified here and in the activity feed when v1 lands.</span>
        </div>
      ) : null}
      {role === 'worker' && d.status === 'submitted' ? (
        <div className="tb-deliv-callout">
          <strong>In review with {firm.contact}</strong>
          <span>You’ll see approve or changes-requested here. Keep working the other deliverables meanwhile.</span>
        </div>
      ) : null}

      {d.history.length ? (
        <div className="tb-deliv-history">
          <div className="tb-deliv-sub-head"><span>Version history</span></div>
          <ol>
            {[...d.history].reverse().map((h) => (
              <li key={h.version}>
                <span className="v">v{h.version}</span>
                <span className="body">
                  <strong>{h.fileName}</strong>
                  <span>{fmtTime(h.at)}{h.verdict ? ` · ${h.verdict === 'approved' ? 'approved' : 'changes requested'}${h.comment ? ` — “${h.comment}”` : ''}` : ' · in review'}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

/* ---------- document preview mocks (watermarked, non-selectable) ---------- */

function seeded(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
}

export function DocPreview({ kind, name, job, watermarks, compact }: { kind: FileKind; name: string; job: Job; watermarks: React.ReactNode; compact?: boolean }) {
  const codes = ['Nightjar', 'Peer A', 'Peer B', 'Peer C', 'Peer D', 'Peer E', 'Peer F', 'Peer G'];
  const rowCount = compact ? 5 : 8;
  // Deterministic per file name; computed once so re-renders don't reshuffle the numbers.
  const data = useMemo(() => {
    const rnd = seeded(name);
    return {
      rows: codes.slice(0, rowCount).map((c) => ({
        c,
        ev: (400 + rnd() * 5200).toFixed(0),
        rev: (1.2 + rnd() * 6).toFixed(1),
        ebitda: (6 + rnd() * 14).toFixed(1),
        pe: (9 + rnd() * 22).toFixed(1),
        src: `10-K FY25 p.${Math.floor(20 + rnd() * 60)}`,
      })),
      med: { rev: (2.4 + rnd() * 2).toFixed(1), ebitda: (10 + rnd() * 4).toFixed(1), pe: (16 + rnd() * 4).toFixed(1) },
      slides: Array.from({ length: compact ? 3 : 6 }, () => Array.from({ length: 6 }, () => 25 + rnd() * 70)),
      growth: (8 + rnd() * 14).toFixed(0),
      revenue: (120 + rnd() * 600).toFixed(0),
      margin: (14 + rnd() * 20).toFixed(0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, compact]);

  return (
    <div className={`tb-viewer-doc tb-doc-${kind}${compact ? ' compact' : ''}`}>
      <div className="tb-watermarks">{watermarks}</div>
      {kind === 'xlsx' ? (
        <table className="tb-sheet">
          <thead>
            <tr><th /><th>Company</th><th>EV ($m)</th><th>EV / Rev</th><th>EV / EBITDA</th><th>P / E</th><th>Source</th></tr>
          </thead>
          <tbody>
            {data.rows.map((r, i) => (
              <tr key={r.c} className={i === 0 ? 'hl' : ''}>
                <td className="rn">{i + 2}</td>
                <td>{r.c}</td>
                <td>{r.ev}</td>
                <td>{r.rev}x</td>
                <td>{r.ebitda}x</td>
                <td>{r.pe}x</td>
                <td className="src">{r.src}</td>
              </tr>
            ))}
            <tr className="tot"><td className="rn">{rowCount + 2}</td><td>Median</td><td /><td>{data.med.rev}x</td><td>{data.med.ebitda}x</td><td>{data.med.pe}x</td><td className="src">calc</td></tr>
          </tbody>
        </table>
      ) : kind === 'pptx' ? (
        <div className="tb-slides">
          {data.slides.map((bars, i) => (
            <div className="tb-slide" key={i}>
              <div className="bar" />
              <div className="t">{i === 0 ? `${job.name} — ${job.workstream}` : ['Executive summary', 'Situation overview', 'Positioning', 'Valuation framework', 'Next steps'][(i - 1) % 5]}</div>
              <div className="cols">
                <div className="chart">{bars.map((h, j) => <span key={j} style={{ height: `${h}%` }} />)}</div>
                <div className="lines"><span /><span /><span className="short" /><span /></div>
              </div>
              <div className="pg">{i + 1}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="tb-docbody">
          <h4>{name.replace(/\.[a-z]+$/i, '').replace(/_/g, ' ')}</h4>
          <div className="doc-meta">{job.name} · {job.workstream} · codenames only · draft</div>
          <h5>1. Overview</h5>
          <p>{job.notes || 'Scope per the engagement brief.'}</p>
          <h5>2. Key figures</h5>
          <p>Nightjar revenue grew {data.growth}% YoY to ${data.revenue}m with EBITDA margin of {data.margin}%. Figures reconcile to the historical financials in the Vault; adjustments are bridged in the backup table.</p>
          {!compact ? (
            <>
              <h5>3. Open items</h5>
              <ul>
                <li>Confirm FY26 run-rate treatment with management.</li>
                <li>Peer C multiple pending calendarization — flagged, not estimated.</li>
                <li>All party names remain codenames per Vault policy.</li>
              </ul>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
