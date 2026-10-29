import React, { useMemo, useState } from 'react';
import {
  CLEARANCE_LABEL,
  ClearanceLevel,
  CreateRequestInput,
  DEFAULT_POLICY,
  DeliverableSpec,
  VaultPolicy,
  WORKFLOWS,
  fmtSize,
  kindFromName,
  workflowById,
} from './demoStore';
import { Ic, KindBadge } from './TalentNav';
import { TbSelect } from './Select';

interface Props {
  onClose: () => void;
  onCreate: (input: CreateRequestInput) => void;
  /** Prefill workflow when opened from a desk card. */
  initialWorkflowId?: string;
}

type StepId = 'workflow' | 'scope' | 'policy';

const STEPS: { id: StepId; label: string }[] = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'scope', label: 'Scope & files' },
  { id: 'policy', label: 'Access policy' },
];

const SAMPLE_FILES: Record<string, { name: string; size: number }[]> = {
  pitch: [{ name: 'PMG_Fall_2026_CommercialBanking.pptx', size: 2_400_000 }, { name: 'Comps_Set_Q3.xlsx', size: 610_000 }],
  cim: [{ name: 'Mgmt_Presentation_Sep2026.pdf', size: 5_100_000 }, { name: 'Historical_Financials_FY21-26.xlsx', size: 880_000 }],
  comps: [{ name: 'Peer_List_Draft.xlsx', size: 120_000 }, { name: 'Target_Financials.xlsx', size: 740_000 }],
  audit: [{ name: 'LBO_Model_v14.xlsx', size: 3_900_000 }, { name: 'Assumptions_Memo.docx', size: 210_000 }],
  screen: [{ name: 'Screening_Criteria.docx', size: 95_000 }, { name: 'Exclusion_List.xlsx', size: 60_000 }],
  ddroom: [{ name: 'Raw_Doc_Dump_Index.xlsx', size: 410_000 }, { name: 'Redaction_Guidance.pdf', size: 320_000 }],
  other: [{ name: 'Brief_Context.pdf', size: 480_000 }],
};

const SAMPLE_NOTES: Record<string, string> = {
  pitch: 'Rebuild comps page with Friday close multiples. Keep all company names as codenames only. Flag any data gaps inline rather than guessing.',
  cim: 'Draft from the management deck and FY21–26 financials in the Vault. Codenames only. Highlight every open question for management rather than filling gaps.',
  comps: 'Peer set is the draft list in the Vault — add or cut with rationale. Calendarize to December FYE. Flag outliers, don’t delete them.',
  audit: 'Audit LBO_Model_v14 end to end: hard-codes, circularity, sign errors, broken links. Log every issue with a cell reference and severity before touching the model.',
  screen: 'Strategic and sponsor universe for a lower-middle-market industrial services target. Apply the exclusion list strictly. Cut to a short list of 20–25 with one-line rationale.',
  ddroom: 'Index the raw dump, propose a 3-level folder tree, and log every redaction by buyer tier. Follow the redaction guidance PDF in the Vault.',
  other: 'Describe the work in plain language: what to produce, what “done” looks like, and any must-not-do constraints. Add deliverables on the right.',
};

function defaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}

export default function NewRequestModal({ onClose, onCreate, initialWorkflowId }: Props) {
  const startId = initialWorkflowId && WORKFLOWS.some((w) => w.id === initialWorkflowId) ? initialWorkflowId : 'pitch';
  const [step, setStep] = useState<StepId>(initialWorkflowId ? 'scope' : 'workflow');
  const [workflowId, setWorkflowId] = useState(startId);
  const wf = useMemo(() => workflowById(workflowId), [workflowId]);

  const [codename, setCodename] = useState('Project Nightjar');
  const [deadline, setDeadline] = useState(defaultDeadline());
  const [notes, setNotes] = useState(SAMPLE_NOTES[startId] ?? SAMPLE_NOTES.pitch);
  const [files, setFiles] = useState<{ name: string; size: number }[]>(SAMPLE_FILES[startId] ?? SAMPLE_FILES.pitch);
  const [dragOver, setDragOver] = useState(false);

  const [included, setIncluded] = useState<Record<string, boolean>>(() => Object.fromEntries(wf.deliverables.map((d) => [d.id, true])));
  const [custom, setCustom] = useState<DeliverableSpec[]>([]);
  const [customTitle, setCustomTitle] = useState('');

  const [policy, setPolicy] = useState<VaultPolicy>(DEFAULT_POLICY);

  function pickWorkflow(id: string) {
    setWorkflowId(id);
    const next = workflowById(id);
    setIncluded(Object.fromEntries(next.deliverables.map((d) => [d.id, true])));
    setCustom([]);
    setFiles(SAMPLE_FILES[id] ?? []);
    setNotes(SAMPLE_NOTES[id] ?? '');
  }

  const chosen: DeliverableSpec[] = [
    ...wf.deliverables.filter((d) => included[d.id]),
    ...custom,
  ];

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list).map((f) => ({ name: f.name, size: f.size }));
    setFiles((prev) => [...prev, ...incoming.filter((f) => !prev.some((p) => p.name === f.name))]);
  }

  function addCustom() {
    const t = customTitle.trim();
    if (!t) return;
    setCustom((c) => [...c, {
      id: `custom-${Date.now()}`,
      title: t,
      kind: 'memo',
      desc: 'Custom deliverable scoped by the deal team.',
      acceptance: 'Reviewed and approved by the requesting banker.',
      dueOffsetDays: 0,
    }]);
    setCustomTitle('');
  }

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const canNext = step === 'workflow' ? true : step === 'scope' ? codename.trim().length > 0 && chosen.length > 0 : true;

  function next() {
    if (step === 'workflow') setStep('scope');
    else if (step === 'scope') setStep('policy');
    else onCreate({ workflowId, codename, deadline, notes, files, deliverables: chosen, policy });
  }
  function back() {
    if (step === 'scope') setStep('workflow');
    else if (step === 'policy') setStep('scope');
  }

  return (
    <div className="tb-modal-backdrop" onClick={onClose}>
      <div className="tb-modal tb-modal-wide tb-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="tb-modal-head">
          <div>
            <h3>New request · the Vault</h3>
            <p className="sub" style={{ marginBottom: 0 }}>Pick a template or Other, scope deliverables, set who can see what. Files stay under the No-Train Lock.</p>
          </div>
          <button type="button" className="tb-modal-close" onClick={onClose}><Ic name="close" size={13} /></button>
        </div>

        <ol className="tb-req-steps">
          {STEPS.map((s, i) => (
            <li key={s.id} className={i < stepIdx ? 'done' : i === stepIdx ? 'active' : ''}>
              <span className="n">{i < stepIdx ? <Ic name="check" size={11} /> : i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>

        <div className="tb-modal-body">
        {step === 'workflow' ? (
          <div className="tb-wf-grid">
            {WORKFLOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`tb-wf-card${w.id === workflowId ? ' active' : ''}${w.id === 'other' ? ' other' : ''}`}
                onClick={() => pickWorkflow(w.id)}
              >
                <div className="tb-wf-top">
                  <strong>{w.label}</strong>
                  <span className="tb-pill">{w.turnaround}</span>
                </div>
                <p>{w.desc}</p>
                <div className="tb-wf-meta">
                  <span>{w.id === 'other' ? 'You define deliverables' : `${w.deliverables.length} deliverables`}</span>
                  {w.id !== 'other' ? (
                    <>
                      <span>·</span>
                      <span>{w.deliverables.map((d) => d.kind).filter((k, i, a) => a.indexOf(k) === i).join(' / ')}</span>
                    </>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {step === 'scope' ? (
          <div className="tb-req-cols">
            <div>
              <div className="tb-field">
                <label>Project codename</label>
                <input value={codename} onChange={(e) => setCodename(e.target.value)} required />
              </div>
              <div className="tb-field">
                <label>Final deadline</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
              </div>
              <div className="tb-field">
                <label>Scope notes for the analyst</label>
                <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="tb-field">
                <label>Firm materials → Vault</label>
                <div
                  className={`tb-dropzone compact${dragOver ? ' drag' : ''}`}
                  onClick={() => document.getElementById('tb-req-files')?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                >
                  <div className="big">Drop decks, models, CIMs — multiple files OK</div>
                  Encrypted in transit · analysts see them only after accepting
                  <input id="tb-req-files" type="file" multiple accept=".pdf,.pptx,.xlsx,.docx,.csv" style={{ display: 'none' }} onChange={(e) => addFiles(e.target.files)} />
                </div>
                <div className="tb-req-files">
                  {files.map((f) => (
                    <div className="tb-file-chip" key={f.name} style={{ marginBottom: 6 }}>
                      <KindBadge kind={kindFromName(f.name)} />
                      <span className="nm">{f.name}</span>
                      <span className="size">{fmtSize(f.size)}</span>
                      <button type="button" className="tb-chip-x" onClick={() => setFiles((p) => p.filter((x) => x.name !== f.name))} aria-label="Remove">
                        <Ic name="close" size={11} />
                      </button>
                    </div>
                  ))}
                  {files.length === 0 ? <div className="tb-form-hint">No files yet — you can also add them later from the Vault.</div> : null}
                </div>
                <div className="tb-form-hint">Suggested for {wf.label.toLowerCase()}: {wf.firmInputs.join(' · ')}</div>
              </div>
            </div>

            <div>
              <div className="tb-field">
                <label>Deliverables the analyst owes you <span className="tb-form-count">{chosen.length}</span></label>
                <div className="tb-deliv-pick">
                  {wf.deliverables.map((d) => (
                    <label key={d.id} className={`tb-deliv-pick-row${included[d.id] ? ' on' : ''}`}>
                      <input type="checkbox" checked={!!included[d.id]} onChange={(e) => setIncluded((p) => ({ ...p, [d.id]: e.target.checked }))} />
                      <div className="body">
                        <div className="t"><KindBadge kind={d.kind} />{d.title}<span className="due">{d.dueOffsetDays === 0 ? 'on deadline' : `D−${d.dueOffsetDays}`}</span></div>
                        <div className="d">{d.desc}</div>
                        <div className="a"><strong>Done when:</strong> {d.acceptance}</div>
                      </div>
                    </label>
                  ))}
                  {custom.map((d) => (
                    <label key={d.id} className="tb-deliv-pick-row on">
                      <input type="checkbox" checked readOnly onChange={() => setCustom((c) => c.filter((x) => x.id !== d.id))} />
                      <div className="body">
                        <div className="t"><KindBadge kind={d.kind} />{d.title}<span className="due">on deadline</span></div>
                        <div className="d">{d.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
                <form className="tb-deliv-add" onSubmit={(e) => { e.preventDefault(); addCustom(); }}>
                  <input placeholder="Add a custom deliverable…" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                  <button type="submit" className="tb-btn ghost">Add</button>
                </form>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'policy' ? (
          <div className="tb-req-cols">
            <div>
              <div className="tb-policy-list">
                <PolicyToggle
                  label="Codenames only"
                  desc="Analyst must refer to every party by codename. Real names in a deliverable trigger a changes request."
                  on={policy.codenamesOnly}
                  onChange={(v) => setPolicy((p) => ({ ...p, codenamesOnly: v }))}
                />
                <PolicyToggle
                  label="AI assist inside the Vault"
                  desc="Analyst can use Clarvy’s private model endpoints on these files. No-Train Lock: never used to train public models."
                  on={policy.aiAssist}
                  onChange={(v) => setPolicy((p) => ({ ...p, aiAssist: v }))}
                />
                <div className="tb-policy-row">
                  <div className="body">
                    <strong>Clearance required</strong>
                    <span>Only analysts cleared at this level are matched.</span>
                  </div>
                  <TbSelect
                    aria-label="Clearance required"
                    value={policy.clearance}
                    onChange={(v) => setPolicy((p) => ({ ...p, clearance: v as ClearanceLevel }))}
                    options={(Object.keys(CLEARANCE_LABEL) as ClearanceLevel[]).map((k) => ({ value: k, label: CLEARANCE_LABEL[k] }))}
                  />
                </div>
                <div className="tb-policy-row">
                  <div className="body">
                    <strong>Firm export</strong>
                    <span>Your own team’s ability to pull deliverables out of the Vault.</span>
                  </div>
                  <TbSelect
                    aria-label="Firm export"
                    value={policy.exportMode}
                    onChange={(v) => setPolicy((p) => ({ ...p, exportMode: v as VaultPolicy['exportMode'] }))}
                    options={[
                      { value: 'none', label: 'Vault only' },
                      { value: 'redacted', label: 'Redacted PDF export' },
                    ]}
                  />
                </div>
              </div>
              <div className="tb-form-note" style={{ marginTop: 12 }}>
                <Ic name="lock" size={14} />
                <span>Always on: no analyst download, no clipboard, watermarked viewer, full audit log, sources destroyed at close.</span>
              </div>
            </div>

            <div className="tb-req-summary">
              <div className="lbl">Summary</div>
              <div className="row"><span>Codename</span><strong>{codename || '—'}</strong></div>
              <div className="row"><span>Workflow</span><strong>{wf.label}</strong></div>
              <div className="row"><span>Deadline</span><strong>{deadline ? new Date(`${deadline}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Rolling'}</strong></div>
              <div className="row"><span>Files in Vault</span><strong>{files.length}</strong></div>
              <div className="row"><span>Deliverables</span><strong>{chosen.length}</strong></div>
              <div className="row"><span>Clearance</span><strong>{CLEARANCE_LABEL[policy.clearance]}</strong></div>
              <ul>
                {chosen.map((d) => <li key={d.id}><KindBadge kind={d.kind} />{d.title}</li>)}
              </ul>
            </div>
          </div>
        ) : null}
        </div>

        <div className="tb-req-foot">
          {stepIdx > 0 ? <button type="button" className="tb-btn ghost" onClick={back}>Back</button> : <span />}
          <button type="button" className="tb-btn primary" disabled={!canNext} onClick={next}>
            {step === 'policy' ? <><Ic name="lock" size={13} /> Lock in Vault &amp; match talent</> : <>Continue <Ic name="arrowR" size={13} /></>}
          </button>
        </div>
      </div>
    </div>
  );
}

function PolicyToggle({ label, desc, on, onChange }: { label: string; desc: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="tb-policy-row">
      <div className="body">
        <strong>{label}</strong>
        <span>{desc}</span>
      </div>
      <button type="button" role="switch" aria-checked={on} className={`tb-switch${on ? ' on' : ''}`} onClick={() => onChange(!on)}>
        <span />
      </button>
    </div>
  );
}
