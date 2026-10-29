/* Shared Company ↔ Worker demo state for /talent */

export type RoleMode = 'company' | 'worker';

/**
 * Realistic marketplace steps:
 * empty → matching → offer_sent → in_progress → awaiting_company → complete
 */
export type DemoStep =
  | 'empty'
  | 'matching'          // request in vault; matched analysts shown to firm
  | 'offer_sent'        // firm picked analyst; worker has a live offer
  | 'in_progress'       // worker accepted; vault open
  | 'awaiting_company'  // draft submitted
  | 'complete';

export interface TalentFirm {
  firmName: string;
  contact: string;
  email: string;
  firmType: string;
}

export interface AnalystExperience {
  title: string;
  org: string;
  detail: string;
  when?: string;
}

export interface AnalystProject {
  title: string;
  detail: string;
  link?: string;
}

export interface Analyst {
  id: string;
  name: string;
  school: string;
  year: string;
  focus: string;
  score: number; // match %
  initials: string;
  color: string;
  why: string;
  /** Richer profile shown when you click them */
  headline?: string;
  bio?: string;
  major?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  photoUrl?: string;
  tools?: string[];
  workstreams?: string[];
  languages?: string[];
  availability?: string;
  standing?: number;
  engagements?: number;
  experience?: AnalystExperience[];
  projects?: AnalystProject[];
  /** Firms / clubs / orgs they've worked with */
  companies?: string[];
}

export interface FeedItem {
  id: string;
  tile: string;
  color: string;
  name: string;
  sub: string;
  unread?: boolean;
  note?: string;
  side: 'company' | 'worker' | 'both';
}

/* ---------- Vault: workflows, deliverables, files, audit ---------- */

export type FileKind = 'pptx' | 'xlsx' | 'docx' | 'pdf' | 'memo';

export interface DeliverableSpec {
  id: string;
  title: string;
  kind: FileKind;
  desc: string;
  /** What "done" means — institutions sign off against this. */
  acceptance: string;
  /** Days before the engagement deadline this is due (0 = on deadline). */
  dueOffsetDays: number;
}

export interface WorkflowTemplate {
  id: string;
  label: string;
  short: string;
  desc: string;
  turnaround: string;
  /** What the firm should drop in the Vault for this workflow. */
  firmInputs: string[];
  deliverables: DeliverableSpec[];
}

export type DeliverableStatus = 'todo' | 'submitted' | 'changes' | 'approved';

export interface DeliverableVersion {
  version: number;
  fileName: string;
  note: string;
  at: string;
  verdict?: 'approved' | 'changes';
  comment?: string;
}

export interface Deliverable extends DeliverableSpec {
  status: DeliverableStatus;
  version: number;
  fileName: string | null;
  note: string | null;
  submittedAt: string | null;
  review: { verdict: 'approved' | 'changes'; comment: string; at: string } | null;
  history: DeliverableVersion[];
}

export type VaultFolder = 'firm' | 'working' | 'deliverable';

export interface VaultFile {
  id: string;
  name: string;
  kind: FileKind;
  folder: VaultFolder;
  size: string;
  by: string;
  at: string;
  version: number;
  deliverableId?: string;
}

export interface AuditEvent {
  id: string;
  at: string;
  who: string;
  action: string;
  detail?: string;
}

export type ClearanceLevel = 'standard' | 'sponsor' | 'public';

export interface VaultPolicy {
  codenamesOnly: boolean;
  clearance: ClearanceLevel;
  exportMode: 'none' | 'redacted';
  aiAssist: boolean;
}

export const DEFAULT_POLICY: VaultPolicy = {
  codenamesOnly: true,
  clearance: 'standard',
  exportMode: 'none',
  aiAssist: true,
};

export const CLEARANCE_LABEL: Record<ClearanceLevel, string> = {
  standard: 'Standard NDA',
  sponsor: 'PE sponsor cleared',
  public: 'Wall-crossed · MNPI',
};

export const WORKFLOWS: WorkflowTemplate[] = [
  {
    id: 'pitch',
    label: 'Pitch deck support',
    short: 'Pitch',
    desc: 'Refresh comps, rebuild pages, and tighten the narrative on a sell-side or buy-side pitch.',
    turnaround: '48–72h',
    firmInputs: ['Prior pitch deck (.pptx)', 'Comps set or model (.xlsx)', 'Style guide / template'],
    deliverables: [
      { id: 'comps-page', title: 'Comps page refresh', kind: 'xlsx', desc: 'Trading comps with latest close multiples, footnoted to source.', acceptance: 'Ties to source; multiples to 1 decimal; codenames only.', dueOffsetDays: 3 },
      { id: 'exec-summary', title: 'Executive summary slide', kind: 'pptx', desc: 'One-page summary of the situation, angle, and ask.', acceptance: 'Single slide; every claim sourced in footnote.', dueOffsetDays: 2 },
      { id: 'positioning', title: 'Positioning & key themes', kind: 'pptx', desc: '4–6 slides on positioning, buyer universe, and value drivers.', acceptance: 'Template-compliant; no orphan charts; speaker notes filled.', dueOffsetDays: 1 },
      { id: 'deck-v1', title: 'Full deck v1 + change log', kind: 'pptx', desc: 'Assembled deck with a one-page change log vs. prior version.', acceptance: 'Change log lists every edited slide; page numbers consistent.', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'cim',
    label: 'CIM / teaser drafting',
    short: 'CIM',
    desc: 'Draft the teaser and CIM sections from management materials and financials.',
    turnaround: '5–7 days',
    firmInputs: ['Management presentation', 'Historical financials (.xlsx)', 'Data room index'],
    deliverables: [
      { id: 'teaser', title: 'Anonymous teaser (2 pp.)', kind: 'pdf', desc: 'Blind two-pager for first-round outreach.', acceptance: 'No identifying details; key metrics match financials.', dueOffsetDays: 4 },
      { id: 'cim-business', title: 'CIM — Business overview', kind: 'docx', desc: 'Company, products, customers, go-to-market.', acceptance: 'Every figure footnoted; consistent codenames.', dueOffsetDays: 2 },
      { id: 'cim-financials', title: 'CIM — Financial overview', kind: 'docx', desc: 'Historical + projected financials narrative with backup tables.', acceptance: 'Tables reconcile to model; adjustments bridged.', dueOffsetDays: 1 },
      { id: 'buyer-qa', title: 'Anticipated buyer Q&A', kind: 'docx', desc: '25–40 likely diligence questions with draft answers.', acceptance: 'Grouped by topic; flags open items for management.', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'comps',
    label: 'Comps & precedent transactions',
    short: 'Comps',
    desc: 'Build or refresh trading comps and precedent transaction sets with a football field.',
    turnaround: '24–48h',
    firmInputs: ['Peer list or sector', 'Target financials', 'House formatting template'],
    deliverables: [
      { id: 'trading-comps', title: 'Trading comps set', kind: 'xlsx', desc: 'EV/Revenue, EV/EBITDA, P/E across peer set with calendarization.', acceptance: 'Source cells referenced; outliers flagged, not deleted.', dueOffsetDays: 2 },
      { id: 'precedents', title: 'Precedent transactions set', kind: 'xlsx', desc: 'Last 5–7 years of relevant deals with implied multiples.', acceptance: 'Deal source + date on every row; premium calc shown.', dueOffsetDays: 1 },
      { id: 'football-field', title: 'Football field slide', kind: 'pptx', desc: 'Valuation ranges across methodologies on one slide.', acceptance: 'Ranges tie to sheets; axis labels and footnotes complete.', dueOffsetDays: 0 },
      { id: 'source-log', title: 'Source log', kind: 'xlsx', desc: 'Every data point mapped to a filing, page, or terminal pull.', acceptance: 'One row per figure; no "various" entries.', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'audit',
    label: 'Model audit',
    short: 'Audit',
    desc: 'Independent check of an operating or LBO model for errors, hard-codes, and broken logic.',
    turnaround: '48h',
    firmInputs: ['Model (.xlsx)', 'Assumptions memo', 'Prior version for diff (optional)'],
    deliverables: [
      { id: 'error-log', title: 'Error log with cell references', kind: 'xlsx', desc: 'Every issue found with sheet!cell, severity, and suggested fix.', acceptance: 'Severity tagged; no issue without a cell ref.', dueOffsetDays: 1 },
      { id: 'fixed-model', title: 'Corrected model', kind: 'xlsx', desc: 'Model with fixes applied and changed cells highlighted.', acceptance: 'Change cells highlighted; checks sheet all zero.', dueOffsetDays: 0 },
      { id: 'audit-memo', title: 'Audit memo', kind: 'memo', desc: 'One-page summary: what broke, what moved, what to re-verify.', acceptance: 'Quantifies valuation impact of each material fix.', dueOffsetDays: 0 },
      { id: 'sensitivity', title: 'Sensitivity check', kind: 'xlsx', desc: 'Data tables on key drivers after fixes.', acceptance: 'Two-way tables for 3 drivers; base case matches.', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'screen',
    label: 'Buyer / target screening',
    short: 'Screen',
    desc: 'Build a long list, cut it to a short list with rationale, and profile the top names.',
    turnaround: '3–5 days',
    firmInputs: ['Screening criteria', 'Exclusion list', 'Deal rationale brief'],
    deliverables: [
      { id: 'long-list', title: 'Long list (80–120 names)', kind: 'xlsx', desc: 'Strategic + sponsor universe with fit scoring.', acceptance: 'Criteria columns filled; exclusions removed.', dueOffsetDays: 3 },
      { id: 'short-list', title: 'Short list with rationale', kind: 'xlsx', desc: 'Top 20–25 with one-line fit rationale and likely contact.', acceptance: 'Each rationale references a criterion; contact source noted.', dueOffsetDays: 1 },
      { id: 'profiles', title: 'Top-10 buyer profiles', kind: 'pptx', desc: 'One slide per buyer: strategy, recent deals, capacity.', acceptance: 'Template-compliant; deal data sourced.', dueOffsetDays: 0 },
      { id: 'outreach-tracker', title: 'Outreach tracker', kind: 'xlsx', desc: 'Tracker shell with status, owner, and NDA columns.', acceptance: 'Matches short list; dropdowns for status.', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'ddroom',
    label: 'DD data room prep',
    short: 'Data room',
    desc: 'Index, structure, and redact materials ahead of opening a data room to buyers.',
    turnaround: '3–4 days',
    firmInputs: ['Raw document dump', 'Redaction guidance', 'Buyer tiering'],
    deliverables: [
      { id: 'dr-index', title: 'Data room index', kind: 'xlsx', desc: 'Numbered index mapped to folder structure with doc owners.', acceptance: 'Every file indexed once; owner assigned.', dueOffsetDays: 2 },
      { id: 'dr-structure', title: 'Folder structure & naming memo', kind: 'memo', desc: 'Proposed tree and naming convention for the room.', acceptance: 'Max 3 levels deep; naming rule stated.', dueOffsetDays: 2 },
      { id: 'redaction-log', title: 'Redaction log', kind: 'xlsx', desc: 'Doc, page, what was redacted, and why, by buyer tier.', acceptance: 'Tier logic applied; no unlogged redactions.', dueOffsetDays: 1 },
      { id: 'qa-tracker', title: 'Q&A tracker', kind: 'xlsx', desc: 'Buyer question log shell with SLA and owner columns.', acceptance: 'Matches index numbering; SLA column present.', dueOffsetDays: 0 },
    ],
  },
  {
    id: 'other',
    label: 'Other / custom scope',
    short: 'Custom',
    desc: 'Not one of the six templates? Describe the work in scope notes and add the deliverables you need.',
    turnaround: 'Scoped quote',
    firmInputs: ['Brief / context files', 'Example of the output you want', 'Deadline and review owner'],
    deliverables: [
      { id: 'custom-primary', title: 'Primary deliverable', kind: 'memo', desc: 'Rename or replace this on the next step — title, format, and done-when.', acceptance: 'Matches the acceptance criteria you write.', dueOffsetDays: 0 },
    ],
  },
];

export function workflowById(id: string): WorkflowTemplate {
  return WORKFLOWS.find((w) => w.id === id) ?? WORKFLOWS[0];
}

export function kindFromName(name: string): FileKind {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'pptx' || ext === 'ppt' || ext === 'key') return 'pptx';
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') return 'xlsx';
  if (ext === 'docx' || ext === 'doc') return 'docx';
  if (ext === 'pdf') return 'pdf';
  return 'memo';
}

export function fileExt(kind: FileKind): string {
  return kind === 'memo' ? 'md' : kind;
}

export function fmtSize(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1_000)} KB`;
  return `${bytes} B`;
}

export function makeDeliverables(spec: DeliverableSpec[]): Deliverable[] {
  return spec.map((s) => ({
    ...s,
    status: 'todo',
    version: 0,
    fileName: null,
    note: null,
    submittedAt: null,
    review: null,
    history: [],
  }));
}

export function deliverableDue(job: Job, d: DeliverableSpec): string {
  if (!job.deadline) return 'Rolling';
  const end = new Date(`${job.deadline}T12:00:00`);
  if (Number.isNaN(end.getTime())) return 'Rolling';
  end.setDate(end.getDate() - d.dueOffsetDays);
  return end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function deliverableProgress(job: Job | null): { total: number; submitted: number; approved: number; changes: number } {
  if (!job) return { total: 0, submitted: 0, approved: 0, changes: 0 };
  const total = job.deliverables.length;
  const approved = job.deliverables.filter((d) => d.status === 'approved').length;
  const submitted = job.deliverables.filter((d) => d.status === 'submitted').length;
  const changes = job.deliverables.filter((d) => d.status === 'changes').length;
  return { total, submitted, approved, changes };
}

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  todo: 'Not started',
  submitted: 'In review',
  changes: 'Changes requested',
  approved: 'Approved',
};

export interface Job {
  id: string;
  tile: string;
  color: string;
  name: string;
  workflowId: string;
  workstream: string;
  deadline: string;
  notes: string;
  fileName: string | null;
  status: 'matching' | 'offered' | 'in_progress' | 'submitted' | 'reviewed';
  matches: Analyst[];
  selectedAnalystId: string | null;
  analystNote: string | null;
  createdAt: string;
  offeredAt: string | null;
  acceptedAt: string | null;
  submittedAt: string | null;
  deliverables: Deliverable[];
  files: VaultFile[];
  audit: AuditEvent[];
  policy: VaultPolicy;
}

export interface DemoState {
  step: DemoStep;
  job: Job | null;
  companyFeed: FeedItem[];
  workerFeed: FeedItem[];
}

export const DEMO_FIRM: TalentFirm = {
  firmName: 'Meridian Partners',
  contact: 'Jane Whitfield',
  email: 'jane@meridianpartners.com',
  firmType: 'Boutique advisory',
};

export const DEMO_NDA = '2026-10-27T20:00:00.000Z';

export const COLORS = {
  navy: '#1e3a6e',
  teal: '#0f8a8a',
  wine: '#8a2e3c',
  purple: '#6d4fc4',
  amber: '#d98324',
  black: '#1c1c1a',
  blue: '#2f6bed',
  green: '#178a4c',
};

export const BENCH: Analyst[] = [
  {
    id: 'a-sofia',
    name: 'Sofia Chen',
    school: 'Wharton',
    year: '26',
    focus: 'M&A / pitch decks',
    score: 96,
    initials: 'SC',
    color: COLORS.navy,
    why: 'Prior sell-side decks + comps sets. Cleared NDA · vault-trained.',
    headline: 'Wharton junior · M&A decks and comps',
    bio: 'Prior sell-side pitch decks and comps sets through Wharton Finance Club. Looking for overnight deck turns and same-day comps refreshes.',
    major: 'Finance',
    location: 'Philadelphia, PA',
    linkedIn: 'linkedin.com/in/sofiachen',
    github: 'github.com/sofiachen',
    tools: ['Excel', 'PowerPoint', 'Capital IQ', 'PitchBook'],
    workstreams: ['Pitch decks', 'Comps & precedents', 'CIMs / teasers'],
    languages: ['English', 'Mandarin'],
    availability: 'Tonight after 8pm ET',
    standing: 94,
    engagements: 7,
    companies: ['Wharton Finance Club', 'Harris Williams', 'Evercore'],
    experience: [
      { title: 'Analyst', org: 'Wharton Finance Club', when: '2024–present', detail: 'Led comps pages on two sell-side mock processes; rebuilt a 40-slide deck overnight.' },
      { title: 'Summer analyst', org: 'Harris Williams', when: 'Summer 2025', detail: 'CIM drafting and buyer screening for a middle-market industrials process.' },
    ],
    projects: [
      { title: 'LBO case — consumer roll-up', detail: 'Full LBO + sensitivity pack for a club case competition. Sources footnoted.', link: 'github.com/sofiachen/lbo-rollup' },
      { title: 'Sell-side deck template', detail: 'Reusable 35-slide IB pitch template with comps and process timeline modules.' },
    ],
  },
  {
    id: 'a-daniel',
    name: 'Daniel Okafor',
    school: 'NYU Stern',
    year: '27',
    focus: 'CIM / writing',
    score: 91,
    initials: 'DO',
    color: COLORS.teal,
    why: 'Strong CIM drafting. Available this week · vault-trained.',
    headline: 'Stern sophomore · CIM writing & teasers',
    bio: 'Club CIM lead for three live processes. Strong narrative drafting; comfortable turning banker markup overnight.',
    major: 'Finance & Journalism',
    location: 'New York, NY',
    linkedIn: 'linkedin.com/in/danielokafor',
    tools: ['Excel', 'PowerPoint', 'PitchBook', 'FactSet'],
    workstreams: ['CIMs / teasers', 'Pitch decks', 'Buyer / target screening'],
    languages: ['English', 'Yoruba'],
    availability: 'Open Thu–Sun ET',
    standing: 89,
    engagements: 4,
    companies: ['Stern Investment Management', 'Moelis', 'Lazard'],
    experience: [
      { title: 'CIM lead', org: 'Stern Investment Management', when: '2025–present', detail: 'Owns section drafting and teaser cuts for club-advised sell-side processes.' },
      { title: 'Research intern', org: 'Moelis & Company', when: 'Summer 2025', detail: 'Supporting materials for healthcare coverage; cleaned comps and process trackers.' },
    ],
    projects: [
      { title: 'Teaser library', detail: 'Anonymized teaser pack across industrials and software — used as a teaching set for the club.' },
    ],
  },
  {
    id: 'a-priya',
    name: 'Priya Raman',
    school: 'LSE',
    year: '26',
    focus: 'Valuation / comps',
    score: 88,
    initials: 'PR',
    color: COLORS.purple,
    why: 'Precedent transactions specialist. Cleared for PE sponsors.',
    headline: 'LSE · valuation, comps & precedents',
    bio: 'Precedent transactions specialist with PE-sponsor clearance. Fast at building clean comps sets and footnote trails.',
    major: 'Accounting & Finance',
    location: 'London, UK',
    linkedIn: 'linkedin.com/in/priyaraman',
    github: 'github.com/priyar',
    tools: ['Excel', 'Bloomberg', 'Capital IQ', 'Python'],
    workstreams: ['Comps & precedents', 'Model audits', 'Buyer / target screening'],
    languages: ['English', 'Hindi', 'Tamil'],
    availability: 'UK mornings · ET evenings',
    standing: 91,
    engagements: 9,
    companies: ['LSE Finance Society', 'Rothschild & Co', 'Bain Capital'],
    experience: [
      { title: 'Valuation chair', org: 'LSE Finance Society', when: '2024–present', detail: 'Runs weekly comps workshops; built the club’s precedent database.' },
      { title: 'Summer analyst', org: 'Rothschild & Co', when: 'Summer 2025', detail: 'M&A coverage support — trading comps, deal comps, and board-pack exhibits.' },
    ],
    projects: [
      { title: 'Precedent scraper', detail: 'Python notebook that pulls deal comps from public filings into a clean Excel pack.', link: 'github.com/priyar/precedent-scraper' },
      { title: 'Sensitivity toolkit', detail: 'Reusable Excel add-in for tornado / two-way tables used on model audits.' },
    ],
  },
];

export const EMPTY_STATE: DemoState = {
  step: 'empty',
  job: null,
  companyFeed: [],
  workerFeed: [],
};

export function initialsFromCodename(name: string): string {
  return name.replace(/^Project\s+/i, '').slice(0, 2).toUpperCase() || 'NJ';
}

export function selectedAnalyst(job: Job | null): Analyst | null {
  if (!job?.selectedAnalystId) return null;
  return job.matches.find((a) => a.id === job.selectedAnalystId) ?? null;
}

export interface CreateRequestInput {
  workflowId: string;
  codename: string;
  deadline: string;
  notes: string;
  files: { name: string; size: number }[];
  deliverables: DeliverableSpec[];
  policy: VaultPolicy;
}

export interface DemoActions {
  createRequest: (input: CreateRequestInput) => void;
  selectAnalyst: (analystId: string) => void;
  acceptOffer: () => void;
  /** Analyst submits (or re-submits) one deliverable. */
  submitDeliverable: (deliverableId: string, input: { fileName: string; note: string }) => void;
  /** Firm approves or requests changes on one deliverable. */
  reviewDeliverable: (deliverableId: string, verdict: 'approved' | 'changes', comment: string) => void;
  /** Either side drops a file into a Vault folder. */
  addVaultFile: (folder: VaultFolder, file: { name: string; size: number }, by: string) => void;
  /** Audit trail: viewer opened a file. */
  logView: (who: string, target: string) => void;
  /** Quick path: submit every outstanding deliverable with a default note. */
  submitDraft: (analystNote: string) => void;
  /** Quick path: approve everything outstanding and close. */
  markReviewed: () => void;
  reset: () => void;
}

export interface CoachCopy {
  title: string;
  body: string;
  cta?: string;
  targetRole?: RoleMode;
  primaryAction?: 'new_request' | 'select_top' | 'accept_offer' | 'open_vault' | 'reset';
}

export function coachFor(step: DemoStep, role: RoleMode): CoachCopy | null {
  if (step === 'empty') {
    if (role === 'company') {
      return {
        title: 'Step 1 of 5 — Create a request',
        body: 'Drop a deck into the Vault (No-Train Lock + NDA already on file). We’ll match cleared finance students by skill — you pick who gets the offer.',
        cta: 'New request',
        primaryAction: 'new_request',
      };
    }
    return {
      title: 'Worker queue is empty',
      body: 'Offers appear here after a firm creates a request and selects you from the matched bench. Switch to Company to start.',
      cta: 'Switch to Company',
      targetRole: 'company',
    };
  }

  if (step === 'matching') {
    if (role === 'company') {
      return {
        title: 'Step 2 of 5 — Connect to an analyst',
        body: '3 cleared analysts matched on skill + availability. Pick one to send a secure engagement offer — they can’t see files until they accept.',
        cta: 'Select top match',
        primaryAction: 'select_top',
      };
    }
    return {
      title: 'Waiting on the firm',
      body: 'A request is matching on the company side. Switch to Company, pick an analyst, then come back to accept the offer.',
      cta: 'Switch to Company',
      targetRole: 'company',
    };
  }

  if (step === 'offer_sent') {
    if (role === 'company') {
      return {
        title: 'Step 3 of 5 — Offer sent',
        body: 'Engagement offer is with your selected analyst. Switch to Worker to accept it — vault access unlocks only after they accept.',
        cta: 'Switch to Worker',
        targetRole: 'worker',
      };
    }
    return {
      title: 'Step 3 of 5 — Accept the engagement',
      body: 'Meridian Partners selected you. Accept to unlock the Vault (watermarked, no download). Decline would return it to the bench.',
      cta: 'Accept offer',
      primaryAction: 'accept_offer',
    };
  }

  if (step === 'in_progress') {
    if (role === 'worker') {
      return {
        title: 'Step 4 of 5 — Work the deliverables in the Vault',
        body: 'You’re connected. Firm materials, your working files, and the deliverable checklist live in one secure workspace. Submit each deliverable as you finish it — the firm reviews them one by one.',
        cta: 'Open Vault workspace',
        primaryAction: 'open_vault',
      };
    }
    return {
      title: 'Step 4 of 5 — Analyst connected',
      body: 'Your analyst accepted and is working inside the Vault. Open the workspace to drop more source files, watch the audit log, or review deliverables as they land.',
      cta: 'Open Vault workspace',
      primaryAction: 'open_vault',
    };
  }

  if (step === 'awaiting_company') {
    if (role === 'worker') {
      return {
        title: 'Step 5 of 5 — All deliverables submitted',
        body: 'Every deliverable is in the firm’s review queue. Flip to Company to approve or request changes — that’s the firm’s view of your work.',
        cta: 'Switch to Company',
        targetRole: 'company',
      };
    }
    return {
      title: 'Step 5 of 5 — Review deliverables & close',
      body: 'All deliverables are in. Approve each one against its acceptance criteria, or send it back with a comment. The engagement closes when everything is approved.',
      cta: 'Review deliverables',
      primaryAction: 'open_vault',
    };
  }

  if (step === 'complete') {
    return {
      title: 'Engagement closed',
      body: 'Request → match → offer → accept → deliverables → sign-off. Sources are scheduled for destruction under the No-Train Lock and the analyst’s track record is updated. Reset to run it empty again.',
      cta: 'Reset demo',
      primaryAction: 'reset',
    };
  }

  return null;
}

/** Pipeline chips for the connection panel */
export function pipelineStages(step: DemoStep): { id: string; label: string; state: 'done' | 'active' | 'todo' }[] {
  const order: DemoStep[] = ['empty', 'matching', 'offer_sent', 'in_progress', 'awaiting_company', 'complete'];
  const labels = ['Request', 'Match', 'Offer', 'Working', 'Review', 'Done'];
  const idx = order.indexOf(step);
  return labels.map((label, i) => ({
    id: order[i],
    label,
    state: i < idx ? 'done' : i === idx ? 'active' : 'todo',
  }));
}
