import React, { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  TOP_25_SCHOOLS,
  demoVerificationCode,
  validateFirmEmail,
  validateStudentEmail,
} from './schools';
import {
  firmFromForm,
  saveSession,
  studentFromForm,
  type ClarvySession,
} from './session';
import { Link, navigate, currentHash, scrollToHash } from './router';
import { TbSelect } from './Select';
import { joinClarvyWaitlist } from './waitlist';
import { isSupabaseConfigured, supabase } from '../../supabaseClient';
import './marketing.css';

/* ------------------------------------------------------------------
   Copy that must stay verbatim (trust framework)
------------------------------------------------------------------- */
export const QUOTE_NO_TRAIN =
  'Your deal data is processed securely, never stored permanently, and never used to train public models.';
export const QUOTE_TALENT =
  'Our auditors are top-tier finance students training for institutional roles. They handle your files inside a secure interface where they cannot download or copy your text.';

/** Set to a string like "From $1,500 / engagement" to publish firm pricing. null = "Talk to us". */
const FIRM_PRICE: string | null = null;

/* ------------------------------------------------------------------
   Icons
------------------------------------------------------------------- */
const P: Record<string, string> = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  check: 'M5 12l4 4L19 6',
  lock: 'M8 11V8a4 4 0 0 1 8 0v3M7 11h10a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zm5 3.5v2',
  shield: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z',
  doc: 'M8 3.5h6.5L18.5 8v12.5H8zM14.5 3.5V8h4.5M10.5 12.5h5M10.5 16h5',
  school: 'M3 10l9-5 9 5-9 5zM7 12v5c0 1 2.5 2.5 5 2.5s5-1.5 5-2.5v-5',
  rooms: 'M4.5 5.5h15v13h-15zM4.5 10h15M10 10v8.5M14 13.5h2.5M14 16.5h2.5',
  bench: 'M12 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5.5 20.5c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5',
  chat: 'M5 5.5h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9.5L5 19.5v-13a1 1 0 0 1 1-1z',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  mail: 'M4 6.5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm0 1.2 8 5.3 8-5.3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  bank: 'M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 19h18',
};

export function MIc({ name, size = 16 }: { name: keyof typeof P; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={P[name]} />
    </svg>
  );
}

/** Clarvy mark — vault aperture + modular bench bars. */
export function ClarvyMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
    >
      {/* Open frame (vault / clearance) — gap on the left like a C */}
      <path
        d="M18 9h14.5A7.5 7.5 0 0 1 40 16.5v15A7.5 7.5 0 0 1 32.5 39H18"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Modular bars — standing / track record */}
      <rect x="19.5" y="24" width="4" height="9.5" rx="1.1" fill="currentColor" />
      <rect x="25.5" y="18" width="4" height="15.5" rx="1.1" fill="currentColor" />
      <rect x="31.5" y="21" width="4" height="12.5" rx="1.1" fill="currentColor" />
      {/* Aperture pupil */}
      <circle cx="14" cy="24" r="3.2" fill="currentColor" />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Chrome: announcement bar, nav, footer
------------------------------------------------------------------- */

function Announce() {
  return null;
}

function Menu({
  label,
  active,
  open,
  onOpenChange,
  items,
}: {
  label: string;
  active?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { to: string; icon?: keyof typeof P; title: string; sub: string }[];
}) {
  const closeTimer = useRef<number | null>(null);

  function clearClose() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openMenu() {
    clearClose();
    onOpenChange(true);
  }

  function scheduleClose() {
    clearClose();
    closeTimer.current = window.setTimeout(() => onOpenChange(false), 120);
  }

  useEffect(() => () => clearClose(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  return (
    <div
      className={`db-menu${open ? ' open' : ''}`}
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={active ? 'active' : ''}
        aria-expanded={open}
        aria-haspopup="menu"
        onFocus={openMenu}
        onClick={(e) => {
          // Hover opens the menu — click must not toggle or navigate.
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {label} <span className="db-menu-plus">+</span>
      </button>
      <div className="db-menu-panel" role="menu" aria-hidden={!open}>
        {items.map((it) => (
          <Link
            key={it.to + it.title}
            to={it.to}
            role="menuitem"
            tabIndex={open ? 0 : -1}
            onClick={(e) => {
              onOpenChange(false);
              const [pathPart, hashPart] = it.to.split('#');
              // Already on /product → in-page scroll only (parent never navigates; hover opens).
              if (hashPart && (pathPart || '/') === '/product' && document.getElementById(hashPart)) {
                e.preventDefault();
                navigate(`/product#${hashPart}`);
              }
            }}
          >
            <strong>{it.title}</strong>
            <span>{it.sub}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function MarketingNav({
  path,
  session,
}: {
  path: string;
  session: ClarvySession | null;
}) {
  const productActive = ['/product', '/security', '/firms'].includes(path);
  const useActive = path === '/use-cases';
  const discoverActive = ['/students', '/schools', '/customers', '/about', '/help'].includes(path);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [onDark, setOnDark] = useState(false);
  const [openMenu, setOpenMenu] = useState<'product' | 'discover' | null>(null);

  useEffect(() => {
    setOpenMenu(null);
  }, [path]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const sync = () => {
      const navH = wrap.getBoundingClientRect().height || 48;
      const darks = document.querySelectorAll<HTMLElement>('[data-nav-dark]');
      let dark = false;
      for (const el of darks) {
        const r = el.getBoundingClientRect();
        if (r.top < navH && r.bottom > 0) {
          dark = true;
          break;
        }
      }
      setOnDark(dark);
    };

    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
    };
  }, [path]);

  return (
    <div ref={wrapRef} className={`db-nav-wrap${onDark ? ' db-nav-wrap--on-dark' : ''}`}>
      <nav className="db-nav" aria-label="Clarvy">
        <Link to="/" className="db-nav-brand">
          CLARVY
        </Link>
        <div className="db-nav-links">
          <Menu
            label="Product"
            active={productActive}
            open={openMenu === 'product'}
            onOpenChange={(o) => setOpenMenu(o ? 'product' : null)}
            items={[
              { to: '/product#deal-rooms', title: 'Deal rooms', sub: 'Scope, match, deliver in one thread' },
              { to: '/product#secure-vault', title: 'Secure Vault', sub: 'No-Train Lock · Ironclad NDA' },
              { to: '/product#talent-bench', title: 'Talent bench', sub: 'Verified Top-25 students' },
            ]}
          />
          <Menu
            label="Discover"
            active={discoverActive}
            open={openMenu === 'discover'}
            onOpenChange={(o) => setOpenMenu(o ? 'discover' : null)}
            items={[
              { to: '/about', title: 'About', sub: 'Why we built Clarvy' },
              { to: '/students', title: 'For students', sub: 'Join free with your .edu' },
              { to: '/schools', title: 'Participating schools', sub: 'The Top 25 list' },
              { to: '/help', title: 'Help center', sub: 'FAQ and support' },
            ]}
          />
          <Link to="/use-cases" className={useActive ? 'active' : ''}>Use cases</Link>
          <Link to="/pricing" className={path === '/pricing' ? 'active' : ''}>Pricing</Link>
        </div>
        <div className="db-nav-right">
          <Link to="/login" className="db-nav-login">
            Join waitlist <MIc name="arrow" size={13} />
          </Link>
        </div>
      </nav>
    </div>
  );
}

function Footer() {
  return (
    <footer className="db-footer db-footer--nav">
      <nav className="db-footer-nav" aria-label="Footer">
        <Link to="/product">Product</Link>
        <Link to="/students">Discover</Link>
        <Link to="/use-cases">Use cases</Link>
        <Link to="/pricing">Pricing</Link>
      </nav>
      <div className="db-footer-branding">
        <div className="db-footer-wordmark" aria-hidden="true">CLARVY</div>
        <div className="db-footer-legal">
          <button type="button">Cookie preferences</button>
          <span>© {new Date().getFullYear()} Clarvy</span>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------
   Reusable blocks
------------------------------------------------------------------- */

function Shot() {
  return (
    <div className="db-shot-wrap">
      <div className="db-marble">
        {/* Mirrors the live Clarvy shell: chrome + sidebar + floating main */}
        <div className="db-shot" aria-hidden="true">
          <aside className="db-shot-side">
            <div className="db-shot-brand">CLARVY</div>
            <div className="db-shot-quick"><span>Quick access</span><b>⌘K</b></div>
            <div className="db-shot-nav on">Home</div>
            <div className="db-shot-nav">Deal rooms</div>
            <div className="db-shot-nav">Search</div>
            <div className="db-shot-nav">Talent bench</div>
            <div className="db-shot-nav">Messages <span className="badge">2</span></div>
            <div className="db-shot-nav">Saved</div>
            <div className="db-shot-nav">Deadlines</div>
            <div className="db-shot-nav">Vault</div>
            <div className="spacer" />
            <div className="db-shot-nav">Live sessions <span className="badge">1</span></div>
            <div className="db-shot-nav">Request queue</div>
            <div className="db-shot-nav">Help & support</div>
            <div className="db-shot-user">
              <img className="db-shot-avatar" src="/talent/brands/meridian.svg" alt="" />
              <span><b>Jane Whitfield</b><small>Meridian Partners</small></span>
            </div>
          </aside>

          <div className="db-shot-main">
            <div className="db-shot-top">
              <strong className="db-shot-page">Home</strong>
              <div className="right">
                <span className="db-shot-chip">No-Train Lock · NDA on file</span>
                <span className="db-shot-newbtn">+ New request</span>
              </div>
            </div>

            <div className="db-shot-stage">
              <div className="db-shot-pipe">
                <span className="done">Request</span><i className="on" />
                <span className="done">Matched</span><i className="on" />
                <span className="done">Offer accepted</span><i className="on" />
                <span className="now">In Vault</span><i />
                <span>Delivered</span><i />
                <span>Reviewed</span>
              </div>

              <div className="db-shot-grid">
                <section>
                  <div className="db-shot-h">Activity feed</div>
                  <div className="db-shot-feed-label">Today</div>
                  <div className="db-shot-feed">
                    <div className="db-shot-item">
                      <img className="db-shot-face" src="/talent/avatars/sofia-chen.jpg" alt="" />
                      <span><b>Project Nightjar</b><small>Sofia Chen accepted · vault open</small></span>
                      <span className="dot" />
                    </div>
                    <div className="db-shot-item">
                      <img className="db-shot-face" src="/talent/avatars/henry-liu.jpg" alt="" />
                      <span><b>Project Harbor</b><small>Henry Liu · comps refresh ready to review</small></span>
                      <span className="dot" />
                    </div>
                    <div className="db-shot-item">
                      <img className="db-shot-face" src="/talent/avatars/david-okafor.jpg" alt="" />
                      <span><b>Project Atlas</b><small>CIM section 3 · offer sent → David Okafor</small></span>
                    </div>
                    <div className="db-shot-item">
                      <img className="db-shot-face" src="/talent/avatars/aisha-patel.jpg" alt="" />
                      <span><b>Project Kestrel</b><small>Aisha Patel · model audit reviewed · closed</small></span>
                    </div>
                  </div>
                </section>

                <div className="db-shot-right">
                  <section>
                    <div className="db-shot-h">Connected analyst <a>Talent bench →</a></div>
                    <div className="db-shot-connect">
                      <div className="db-shot-parties">
                        <div className="party">
                          <img className="db-shot-avatar" src="/talent/brands/meridian.svg" alt="" />
                          <span><b>Meridian Partners</b><small>Jane Whitfield</small></span>
                        </div>
                        <div className="bridge"><span /><em>Connected</em><span /></div>
                        <div className="party">
                          <img className="db-shot-face" src="/talent/avatars/sofia-chen.jpg" alt="" />
                          <span><b>Sofia Chen</b><small>Wharton ’26</small></span>
                        </div>
                      </div>
                      <p>Analyst is working in the Vault — 1/4 deliverables approved, 1 awaiting your review.</p>
                      <span className="ghost">Open Vault workspace</span>
                    </div>
                  </section>

                  <section>
                    <div className="db-shot-h">Deliverables · 1/4 <a>Go to vault →</a></div>
                    <div className="db-shot-deliv">
                      <div className="row"><i className="ok" /><b>Comps page refresh</b><small>Approved · due Wed</small></div>
                      <div className="row"><i className="wait" /><b>Executive summary slide</b><small>Submitted · Review</small><em>Review</em></div>
                      <div className="row"><i /><b>Positioning & key themes</b><small>In progress · due Thu</small></div>
                      <div className="row"><i /><b>Full deck v1 + change log</b><small>Queued · due Fri</small></div>
                    </div>
                  </section>

                  <section>
                    <div className="db-shot-h">Active engagement</div>
                    <div className="db-shot-engage">
                      <div className="top">
                        <img className="db-shot-face" src="/talent/avatars/sofia-chen.jpg" alt="" />
                        <span><b>Project Nightjar</b><small>Pitch deck support · 48–72h</small></span>
                        <em>In Vault</em>
                      </div>
                      <div className="meta">
                        <span>Clearance · Confidential</span>
                        <span>Export · Watermarked PDF</span>
                        <span>Due Fri 5pm ET</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBand() {
  return (
    <section className="db-trust" id="trust" data-nav-dark>
      <div className="db-trust-inner">
        <div className="db-trust-head">
          <div>
            <h2>Clarvy Vault, the clearance layer for deal work.</h2>
            <p>Signed once. Watermarked always. Training off.</p>
          </div>
          <Link to="/security" className="db-trust-more">Learn more <MIc name="arrow" size={13} /></Link>
        </div>

        <div className="db-trust-stage" aria-hidden="true">
          <img src="/talent/trust-sky.jpg" alt="" className="db-trust-photo" />
          <div className="db-trust-orbit">
            <span className="ring r1" />
            <span className="ring r2" />
            <span className="ring r3" />
            <span className="bubble b1">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z" /></svg>
            </span>
            <span className="bubble b2">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10l9-5 9 5-9 5zM7 12v5c0 1 2.5 2.5 5 2.5s5-1.5 5-2.5v-5" /></svg>
            </span>
            <span className="bubble focus">
              <ClarvyMark size={34} />
            </span>
            <span className="bubble b3">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>
            </span>
            <span className="bubble b4">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <rect x="5" y="13" width="3.2" height="6" rx="0.8" fill="currentColor" />
                <rect x="10.4" y="9" width="3.2" height="10" rx="0.8" fill="currentColor" />
                <rect x="15.8" y="6" width="3.2" height="13" rx="0.8" fill="currentColor" />
              </svg>
            </span>
          </div>
        </div>

        <div className="db-trust-cols">
          <div className="db-trust-col lead">
            <h3>Why firms choose Clarvy</h3>
          </div>
          <div className="db-trust-col">
            <h3>No-Train Privacy Lock</h3>
            <p>Every model call runs through private developer APIs with training disabled. Sources are destroyed at engagement close.</p>
          </div>
          <div className="db-trust-col">
            <h3>Ironclad Vault NDA</h3>
            <p>A mutual NDA is emailed the moment a firm signs up. Nothing uploads until it’s signed — analysts included.</p>
          </div>
          <div className="db-trust-col">
            <h3>Elite, verified talent</h3>
            <p>.edu-verified at 25 universities. Watermarked viewer — no download, no copy.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CtaBand({
  title = 'See what Clarvy can do for your team',
  cta = 'Talk to us',
  to = '/book-demo',
}: { title?: string; sub?: string; cta?: string; to?: string }) {
  return (
    <section className="db-cta" data-nav-dark>
      <div className="db-cta-inner">
        <h2>{title}</h2>
        <Link to={to} className="db-cta-btn">
          {cta} <MIc name="arrow" size={14} />
        </Link>
      </div>
    </section>
  );
}

function PageHero({
  k,
  title,
  sub,
  ctas,
  center,
}: {
  k: string;
  title: string;
  sub: string;
  ctas?: React.ReactNode;
  center?: boolean;
}) {
  return (
    <section className={`db-page-hero${center ? ' center' : ''}`}>
      <div>
        <span className="k">{k}</span>
        <h1>{title}</h1>
        {center ? <p>{sub}</p> : null}
        {center && ctas ? <div className="row">{ctas}</div> : null}
      </div>
      {!center ? (
        <div>
          <p>{sub}</p>
          {ctas ? <div className="row">{ctas}</div> : null}
        </div>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------
   Pages
------------------------------------------------------------------- */

function HomePage() {
  return (
    <>
      <section className="db-hero">
        <div>
          <h1>The talent layer for institutional finance.</h1>
        </div>
        <div className="db-hero-right">
          <p>
            Everything scoped and delivered for pitch decks, CIMs, comps and model audits —
            by verified Top-25 students, inside a vault your compliance team will sign off on.
          </p>
          <div className="db-hero-ctas">
            <Link to="/book-demo" className="db-btn primary">Talk to us</Link>
            <Link to="/login" className="db-btn secondary">Join waitlist</Link>
          </div>
        </div>
      </section>

      <Shot />

      <section className="db-two">
        <div className="db-two-copy">
          <h2>Two offerings.<br />One verified talent bench.</h2>
          <p>Built for banks, boutiques, and finance students training for institutional roles.</p>
        </div>
        <div className="db-two-cards">
          <Link to="/firms" className="db-two-card">
            <div className="db-two-media">
              <img src="/talent/offer-firms.jpg" alt="" />
            </div>
            <h3>Clarvy for firms</h3>
            <p>Staff pitch decks, CIMs, comps and audits from a cleared Top-25 bench. <span>Learn more <MIc name="arrow" size={12} /></span></p>
          </Link>
          <Link to="/students" className="db-two-card">
            <div className="db-two-media">
              <img src="/talent/offer-students.jpg" alt="" />
              <div className="db-two-glass" aria-hidden="true">
                <b>s.chen@wharton.upenn.edu</b>
                <em>Verified · Wharton ’26</em>
                <span>Pitch decks · Comps · Standing 94</span>
              </div>
            </div>
            <h3>Clarvy for students</h3>
            <p>Join free with your .edu. Get matched to real scopes inside the Vault. <span>Learn more <MIc name="arrow" size={12} /></span></p>
          </Link>
        </div>
      </section>

      <section className="db-beyond">
        <div className="db-beyond-head">
          <div>
            <h2>Go beyond intern bandwidth</h2>
            <p>For deal teams that need overflow capacity without the credential bottleneck.</p>
          </div>
          <Link to="/product" className="db-beyond-more">Learn more <MIc name="arrow" size={13} /></Link>
        </div>
        <div className="db-beyond-grid">
          <article className="db-beyond-card">
            <div className="db-beyond-viz marble">
              <div className="staff-stack">
                <div className="glass-prompt">
                  <p>
                    Match 3 cleared analysts for <em>@Nightjar</em> — pitch / comps, Friday close.
                  </p>
                  <div className="tools">
                    <span className="ic" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                    </span>
                    <span className="ic" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="4.2" r="1.8" stroke="currentColor" strokeWidth="1.2"/><path d="M2.5 10c.4-1.8 1.8-2.8 3.5-2.8S9.1 8.2 9.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                    </span>
                    <span className="send" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 9.2V2.8M3.2 5.2 6 2.4l2.8 2.8" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </span>
                  </div>
                </div>
                <div className="match-list">
                  <div className="match-row">
                    <img className="av" src="/talent/avatars/sofia-chen.jpg" alt="" />
                    <div>
                      <strong>Sofia Chen</strong>
                      <small>Wharton · Standing 94</small>
                    </div>
                    <em>Cleared</em>
                  </div>
                  <div className="match-row">
                    <img className="av" src="/talent/avatars/jordan-lee.jpg" alt="" />
                    <div>
                      <strong>Jordan Lee</strong>
                      <small>Stern · Standing 91</small>
                    </div>
                    <em>Cleared</em>
                  </div>
                  <div className="match-row">
                    <img className="av" src="/talent/avatars/anya-patel.jpg" alt="" />
                    <div>
                      <strong>Anya Patel</strong>
                      <small>Booth · Standing 89</small>
                    </div>
                    <em>Cleared</em>
                  </div>
                </div>
              </div>
            </div>
            <h3>Staff in minutes</h3>
            <p>Verified Top-25 students matched on workstream, availability, and standing — not a résumé inbox.</p>
          </article>
          <article className="db-beyond-card">
            <div className="db-beyond-viz sand">
              <div className="turn-card">
                <div className="turn-head">
                  <span>Nightjar · Comps refresh</span>
                  <em>Due Fri 6pm</em>
                </div>
                <ol className="turn-steps">
                  <li className="done"><b /><span>Brief accepted</span><i>Tue 9:14p</i></li>
                  <li className="done"><b /><span>Sources pulled</span><i>Wed 1:02a</i></li>
                  <li className="now"><b /><span>Draft in vault</span><i>14h</i></li>
                  <li><b /><span>Partner review</span><i>—</i></li>
                </ol>
                <div className="turn-foot">
                  <span className="t">On clock</span>
                  <span className="bar"><i style={{ width: '62%' }} /></span>
                  <span className="pct">62%</span>
                </div>
              </div>
            </div>
            <h3>Turn overnight</h3>
            <p>Pitch pages, CIMs, comps and audits land on your clock — with due dates and acceptance criteria built in.</p>
          </article>
          <article className="db-beyond-card">
            <div className="db-beyond-viz grey">
              <div className="quote-card">
                <div className="who-row">
                  <img className="av" src="/talent/avatars/sofia-chen.jpg" alt="" />
                  <div>
                    <strong>Sofia Chen</strong>
                    <small>Wharton ’26 · Pitch / comps</small>
                  </div>
                </div>
                <p>“Comps page rebuilt overnight with Friday close multiples. Three gaps flagged inline — no guessing.”</p>
                <div className="foot">
                  <span className="mark">CLARVY</span>
                  <span>Project Nightjar › Vault</span>
                </div>
                <span className="cursor" aria-hidden="true" />
              </div>
            </div>
            <h3>Trust every file</h3>
            <p>Private APIs with training off. Watermarked viewer. Sources destroyed at engagement close.</p>
          </article>
          <article className="db-beyond-card">
            <div className="db-beyond-viz grey">
              <div className="proven-card">
                <div className="proven-head">
                  <img className="av" src="/talent/avatars/sofia-chen.jpg" alt="" />
                  <div className="proven-who">
                    <strong>Sofia Chen</strong>
                    <small>Wharton ’26 · Pitch / comps</small>
                  </div>
                  <span className="badge">Cleared</span>
                </div>
                <div className="proven-score">
                  <div className="score-num">
                    <em>94 <small>↑2</small></em>
                    <span>Standing</span>
                  </div>
                  <div className="spark">
                    <svg viewBox="0 0 140 36" preserveAspectRatio="none" aria-hidden="true">
                      <defs>
                        <linearGradient id="spkFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#1c1c1a" stopOpacity="0.18" />
                          <stop offset="100%" stopColor="#1c1c1a" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,30 L18,26 L36,28 L52,18 L70,20 L88,12 L108,10 L140,6 L140,36 L0,36 Z" fill="url(#spkFill)" />
                      <polyline fill="none" stroke="#1c1c1a" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" points="0,30 18,26 36,28 52,18 70,20 88,12 108,10 140,6" />
                      <circle cx="140" cy="6" r="2.4" fill="#1c1c1a" />
                    </svg>
                  </div>
                </div>
                <ul className="proven-list">
                  <li>
                    <div>
                      <strong>Nightjar</strong>
                      <small>Comps refresh</small>
                    </div>
                    <span className="rate" aria-label="5 of 5"><i /><i /><i /><i /><i /></span>
                    <em>11h</em>
                  </li>
                  <li>
                    <div>
                      <strong>Cresta</strong>
                      <small>CIM pp. 3–7</small>
                    </div>
                    <span className="rate" aria-label="5 of 5"><i /><i /><i /><i /><i /></span>
                    <em>2.1d</em>
                  </li>
                  <li>
                    <div>
                      <strong>Halcyon</strong>
                      <small>Pitch deck</small>
                    </div>
                    <span className="rate" aria-label="4 of 5"><i /><i /><i /><i /><i className="off" /></span>
                    <em>9h</em>
                  </li>
                </ul>
                <div className="proven-foot">
                  <span><b>100%</b> on-time</span>
                  <span><b>7</b> reviewed</span>
                  <span><b>14h</b> median</span>
                </div>
              </div>
            </div>
            <h3>See who’s proven</h3>
            <p>Standing, turnaround, and reviewed engagements follow every analyst — so you staff on track record.</p>
          </article>
        </div>
      </section>

      <section className="db-connect" id="connect">
        <div className="db-connect-layout">
          <h2>Clarvy clears Top-25 analysts into the vault your counsel will sign.</h2>
          <div className="db-connect-main">
            <div className="db-connect-stage" aria-hidden="true">
              <div className="db-connect-row">
                <span className="db-connect-tile far">
                  <span className="db-connect-face crest">
                    <img src="/talent/schools/harvard-crest.svg" alt="" />
                  </span>
                </span>
                <span className="db-connect-tile near">
                  <span className="db-connect-face white">
                    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                      <path fill="#111" d="M4 4h16v3H4V4zm0 5h7v11H4V9zm9 0h7v5h-7V9zm0 7h7v4h-7v-4z" />
                    </svg>
                  </span>
                </span>
                <span className="db-connect-tile focus">
                  <span className="db-connect-face clarvy">
                    <ClarvyMark size={44} />
                  </span>
                </span>
                <span className="db-connect-tile near">
                  <span className="db-connect-face white">
                    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
                      <path
                        fill="#111"
                        d="M12 2.8 19.2 6v5.4c0 4.7-3.1 8.1-7.2 9.8-4.1-1.7-7.2-5.1-7.2-9.8V6L12 2.8zm0 2.3L8 6.7v4.7c0 3.3 2 5.8 4 7 2-1.2 4-3.7 4-7V6.7L12 5.1zm-2.2 5.1h4.4v2.1h-1.5V16h-1.4v-3.7H9.8V10.2z"
                      />
                    </svg>
                  </span>
                </span>
                <span className="db-connect-tile far">
                  <span className="db-connect-face crest">
                    <img src="/talent/schools/princeton-crest.svg" alt="" />
                  </span>
                </span>
              </div>
            </div>
            <div className="db-connect-foot">
              <p>
                Scope a workstream, match three cleared students, and keep every file inside a watermarked vault.
                Models run with training off. Sources destroy when the engagement closes.
              </p>
              <div className="db-connect-meta">
                <span>On every firm seat — no add-on.</span>
                <Link to="/security">Learn more <MIc name="arrow" size={13} /></Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrustBand />

      <section className="db-story">
        <div className="db-story-grid">
          <div className="db-story-lead">
            <h2>The talent layer institutional finance runs on</h2>
            <Link to="/about" className="db-story-link">About Clarvy <MIc name="arrow" size={13} /></Link>
          </div>
          <p>
            Deal overflow — pitch decks, CIMs, comps and model audits — is the work that burns associate
            bandwidth. Clarvy staffs it from a cleared Top-25 bench, inside a vault your counsel already signs.
          </p>
          <p>
            Every analyst is .edu-verified, NDA-bound, and scored on standing. Files stay watermarked.
            Models run with training off. Sources destroy when the engagement closes.
          </p>
          <p>
            Built for banks and boutiques that need overnight turn without a new vendor process — and for
            students training for institutional roles on real scopes.
          </p>
        </div>
        <div className="db-story-media">
          <img src="/talent/story-room.jpg" alt="" />
        </div>
      </section>

      <WaitlistBand />

      <CtaBand />
    </>
  );
}

function WaitlistBand() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const covers = [
    { img: '/talent/offer-firms.jpg', title: 'Bench', tone: 'dark' },
    { img: '/talent/story-room.jpg', title: 'Vault', tone: 'warm' },
    { img: '/talent/trust-sky.jpg', title: 'Clear', tone: 'sky' },
    { img: '/talent/offer-students.jpg', title: 'Stand', tone: 'cool' },
    { img: '/talent/marble.jpg', title: 'Scope', tone: 'stone' },
    { img: '/talent/feat-speed.jpg', title: 'Turn', tone: 'ink' },
  ];
  return (
    <section className="db-wait">
      <div className="db-wait-copy">
        <h2>Join firms and students already clearing deal work</h2>
        <p>Clarvy is opening in cohorts. Leave your email and we’ll invite you when a seat opens — firms and .edu students alike.</p>
        {done ? (
          <div className="db-wait-done">You’re on the list. We’ll be in touch.</div>
        ) : (
          <form
            className="db-wait-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              setBusy(true);
              const msg = await joinClarvyWaitlist(email, { role: 'unknown', source: 'home' });
              setBusy(false);
              if (msg) {
                setErr(msg);
                return;
              }
              setDone(true);
            }}
          >
            <input
              type="email"
              required
              placeholder="example@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email"
              disabled={busy}
            />
            <button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join the waitlist'}</button>
          </form>
        )}
        {err ? <p className="db-waitlist-err" style={{ marginTop: 10 }}>{err}</p> : null}
      </div>
      <div className="db-wait-covers" aria-hidden="true">
        {covers.map((c) => (
          <article key={c.title} className={`db-wait-cover ${c.tone}`}>
            <img src={c.img} alt="" />
            <div className="mark">
              <strong>{c.title}</strong>
              <span>by Clarvy</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductPage() {
  useEffect(() => {
    const hash = currentHash();
    if (!hash) return;
    const t = window.setTimeout(() => scrollToHash(hash, 'smooth'), 40);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
      <PageHero
        k="Product"
        title="Deal rooms, a verified bench, and a vault — in one surface."
        sub="Clarvy is the system of record for overflow deal work: who asked, who’s on it, what’s been delivered, and proof nothing left the room."
        ctas={<><Link to="/book-demo" className="db-btn primary lg">Talk to us</Link><Link to="/login" className="db-btn secondary lg">Join waitlist</Link></>}
      />
      <Shot />

      <section className="db-section">
        <div className="db-split" id="deal-rooms">
          <div>
            <h3>Deal rooms</h3>
            <p>One thread per codename. Scope the request, lock the file, watch the pipeline move from Matched to Reviewed.</p>
            <ul>
              <li>Six workstreams: pitch decks, CIMs, comps, model audits, screening, data-room prep</li>
              <li>Codenames only — company names never enter the request</li>
              <li>Deadlines, messages and saved items roll up to the room</li>
            </ul>
          </div>
          <div className="db-visual">
            <div className="t">Project Nightjar <span>Pitch deck support</span></div>
            <div className="ln"><b>Request locked</b><span className="r g">Done</span></div>
            <div className="ln"><b>3 analysts matched</b><span className="r g">Done</span></div>
            <div className="ln"><b>Offer → Sofia Chen</b><span className="r g">Accepted</span></div>
            <div className="ln"><b>Working in Vault</b><span className="r">Live</span></div>
            <div className="ln"><b>Draft delivered</b><span className="r" style={{ color: 'var(--m-ink-3)' }}>—</span></div>
          </div>
        </div>

        <div className="db-split rev" id="talent-bench">
          <div>
            <h3>Talent bench</h3>
            <p>Every analyst is an actively enrolled student at a participating university, verified by .edu and bound by the Vault NDA before they see a page.</p>
            <ul>
              <li>Match score on workstream, prior engagements and availability</li>
              <li>Track record built from reviewed deliverables, not résumés</li>
              <li>One offer at a time — no auctions, no race to the bottom</li>
            </ul>
          </div>
          <div className="db-visual">
            <div className="t">Matched for Nightjar <span>3 cleared</span></div>
            <div className="ln"><b>Sofia Chen</b> Wharton ’26 · M&A<span className="r g">96%</span></div>
            <div className="ln"><b>Daniel Okafor</b> NYU Stern ’27 · CIM<span className="r g">91%</span></div>
            <div className="ln"><b>Priya Raman</b> LSE ’26 · Valuation<span className="r g">88%</span></div>
          </div>
        </div>

        <div className="db-split" id="secure-vault">
          <div>
            <h3>Secure Vault</h3>
            <p>Analysts work inside a watermarked viewer. No download, no copy, no right-click. Sources are scheduled for destruction the moment a firm closes the engagement.</p>
            <ul>
              <li>Per-viewer watermark with the signed-in email</li>
              <li>Private, no-train model endpoints only</li>
              <li>Audit trail: who opened what, and when</li>
            </ul>
          </div>
          <div className="db-visual">
            <div className="t">Secure viewer <span>watermarked</span></div>
            <div className="doc">
              <div className="wm">{Array.from({ length: 12 }, (_, i) => <span key={i}>s.chen@wharton.upenn.edu</span>)}</div>
              <div className="l h" /><div className="l" /><div className="l w70" /><div className="l" /><div className="l w40" />
            </div>
          </div>
        </div>
      </section>

      <TrustBand />
      <CtaBand />
    </>
  );
}

const USE_CASES = [
  {
    icon: 'doc' as const,
    t: 'Pitch deck support',
    p: 'Rebuild comps pages, exec summaries, and process timelines inside the Vault. Private AI drafts structure; a cleared Top-25 student owns banker voice, footnotes, and the final slide polish before you review.',
    tags: ['2–6h', 'PowerPoint', 'Vault · no-train'],
  },
  {
    icon: 'doc' as const,
    t: 'CIMs & teasers',
    p: 'Section first drafts and rewrites with sourcing notes attached to every claim. Stay in the watermarked viewer — no Word downloads — and hand a VP-ready narrative the same day.',
    tags: ['8–24h', 'CIM / teaser', 'Sourced'],
  },
  {
    icon: 'spark' as const,
    t: 'Comps & precedents',
    p: 'Refresh trading and transaction comps with latest closes, outlier flags, and rationale cells. Export stays in-product until you mark reviewed; sources destroy when the room closes.',
    tags: ['1–3h', 'Excel', 'Outlier flags'],
  },
  {
    icon: 'eye' as const,
    t: 'Model audits',
    p: 'Formula, link, and circularity passes on operating and LBO models. AI surfaces candidates; the analyst confirms, fixes, and ships a change log you can open next to the workbook in Vault.',
    tags: ['2–6h', 'Excel', 'Change log'],
  },
  {
    icon: 'bench' as const,
    t: 'Buyer / target screening',
    p: 'Long-list builds with filters, contact mapping, and a one-line thesis per name — matched to analysts who’ve done live screening before, not generic research freelancers.',
    tags: ['4–12h', 'Excel', 'Top-25 bench'],
  },
  {
    icon: 'rooms' as const,
    t: 'Data-room prep',
    p: 'Index, rename, and gap-check diligence folders before buyers get access. Every open is watermarked to the signed-in .edu; nothing leaves the room.',
    tags: ['4–12h', 'VDR', 'Audit trail'],
  },
];

function UcAppFrame({
  nav = 'Vault',
  title,
  chips = ['No download', 'Watermarked', 'No-Train Lock'],
  children,
}: {
  nav?: string;
  title: string;
  chips?: string[];
  children: React.ReactNode;
}) {
  // Mirrors company nav in TalentNav.tsx
  const items = ['Home', 'Deal rooms', 'Search', 'Talent bench', 'Messages', 'Saved', 'Deadlines', 'Vault'];
  return (
    <div className="db-uc-app" aria-hidden="true">
      <aside className="db-uc-app-side">
        <div className="brand">CLARVY</div>
        {items.map((n) => (
          <div key={n} className={`nav${n === nav ? ' on' : ''}`}>{n}</div>
        ))}
        <div className="user">
          <img src="/talent/brands/meridian.svg" alt="" />
          <span><b>Meridian Capital</b><small>Project Nightjar</small></span>
        </div>
      </aside>
      <div className="db-uc-app-main">
        <div className="top">
          <strong>{title}</strong>
          <div className="chips">{chips.map((c) => <span key={c} className="chip">{c}</span>)}</div>
        </div>
        <div className="stage">{children}</div>
      </div>
    </div>
  );
}

function UseCasesPage() {
  return (
    <>
      <PageHero
        k="Use cases"
        title="Deal work that used to take days — delivered in hours."
        sub="Six scoped workstreams inside Clarvy’s real product: deal rooms, a Top-25 bench, and a watermarked Vault with private AI. Turnarounds measured in hours — not overnight heroics."
        ctas={<><Link to="/book-demo" className="db-btn primary lg">Talk to us</Link><Link to="/login" className="db-btn secondary lg">Join waitlist</Link></>}
      />

      <section className="db-uc-feature">
        <div className="db-uc-viz">
          <UcAppFrame title="Vault · Project Nightjar · Pitch deck">
            <div className="db-uc-vault">
              <aside className="db-uc-vault-files">
                <div className="hd">Deliverables <em>1/4</em></div>
                <button type="button" className="row on"><i className="st done" /><span>Cover & agenda<small>Approved · v2</small></span></button>
                <button type="button" className="row on"><i className="st work" /><span>Trading comps<small>In review · v3</small></span></button>
                <button type="button" className="row"><i className="st todo" /><span>Process timeline<small>Due today 6pm</small></span></button>
                <button type="button" className="row"><i className="st todo" /><span>Appendix<small>Not started</small></span></button>
                <div className="hd">Firm materials <em>3</em></div>
                <button type="button" className="row file"><span>Nightjar_teaser.pdf<small>1.2 MB · locked</small></span></button>
                <button type="button" className="row file"><span>CapIQ_extract.xlsx<small>840 KB · locked</small></span></button>
              </aside>
              <div className="db-uc-vault-view">
                <div className="banner">Secure interface · Downloads disabled · Watermarked for s.chen@wharton.edu</div>
                <figure className="shot">
                  <img src="/talent/uc-comps-slide.jpg" alt="" />
                </figure>
                <div className="ai-chip">
                  <ClarvyMark size={14} />
                  Private model applied structure · Sofia reviewing banker voice
                </div>
              </div>
            </div>
          </UcAppFrame>
        </div>
        <div className="db-uc-copy">
          <span className="eyebrow">Pitch decks</span>
          <h2>First draft before the morning call</h2>
          <p className="lead">Comps, exec summary, process — in the real Vault</p>
          <p>
            Open a deal room under a codename, upload the source pack, and Clarvy matches three cleared analysts
            from Home → Talent bench. You send one offer. Inside Vault, private AI drafts slide structure while
            the student rebuilds comps, tightens thesis, and footnotes every chart — watermarked to their .edu.
            Typical turnaround: 2–6 hours from accept to a reviewable deck. Nothing leaves the room.
          </p>
          <ul className="db-uc-points">
            <li>Same Vault shell as the product — deliverables, firm materials, watermark</li>
            <li>AI assist on structure only — student owns banker voice</li>
            <li>Review, comment, and approve deliverable-by-deliverable</li>
          </ul>
        </div>
      </section>

      <section className="db-uc-feature rev">
        <div className="db-uc-viz">
          <UcAppFrame title="Vault · Comps · Nightjar.xlsx">
            <div className="db-uc-vault">
              <aside className="db-uc-vault-files">
                <div className="hd">Deliverables <em>0/1</em></div>
                <button type="button" className="row on"><i className="st work" /><span>Trading comps refresh<small>In progress · v1</small></span></button>
                <div className="hd">Working files <em>2</em></div>
                <button type="button" className="row file on"><span>Nightjar_comps_v1.xlsx<small>Viewer · copy off</small></span></button>
                <button type="button" className="row file"><span>Peer_notes.docx<small>Scratch · locked</small></span></button>
              </aside>
              <div className="db-uc-vault-view">
                <div className="banner">Secure interface · Copy disabled · Every open is logged</div>
                <figure className="shot">
                  <img src="/talent/uc-comps-sheet.jpg" alt="" />
                </figure>
                <div className="meta-row">
                  <span>Outlier flagged · Peer B</span>
                  <span>Rationale column filled</span>
                  <span>CapIQ extract locked</span>
                </div>
              </div>
            </div>
          </UcAppFrame>
        </div>
        <div className="db-uc-copy">
          <span className="eyebrow">Comps & precedents</span>
          <h2>Refresh multiples in hours, not a weekend</h2>
          <p className="lead">Clean sets with outlier flags and rationale</p>
          <p>
            Drop last quarter’s sheet into Firm materials. Clarvy’s private endpoints structure the refresh; the
            matched analyst updates closes, flags outliers, and writes the “why” cell you need in IC. You open the
            workbook in the watermarked Vault viewer — no download, no email chain — and mark the deliverable
            reviewed when it’s done. Most comps land in 1–3 hours.
          </p>
          <ul className="db-uc-points">
            <li>Trading + transaction comps in one deal room</li>
            <li>Outliers highlighted before you open the file</li>
            <li>Export only after firm review (optional)</li>
          </ul>
        </div>
      </section>

      <section className="db-uc-feature">
        <div className="db-uc-viz">
          <UcAppFrame title="Vault · CIM · Section 3">
            <div className="db-uc-vault">
              <aside className="db-uc-vault-files">
                <div className="hd">Deliverables <em>1/3</em></div>
                <button type="button" className="row"><i className="st done" /><span>§2 Company overview<small>Approved</small></span></button>
                <button type="button" className="row on"><i className="st work" /><span>§3 Investment highlights<small>Draft · v2</small></span></button>
                <button type="button" className="row"><i className="st todo" /><span>§4 Financials<small>Queued</small></span></button>
                <div className="hd">Brief</div>
                <button type="button" className="row file"><span>Scope · banker voice<small>Cite every metric</small></span></button>
              </aside>
              <div className="db-uc-vault-view">
                <div className="banner">Secure interface · Watermarked for s.chen@wharton.edu</div>
                <figure className="shot">
                  <img src="/talent/uc-cim-doc.jpg" alt="" />
                </figure>
                <div className="ai-chip">
                  <ClarvyMark size={12} />
                  AI coach · 3 sourcing notes suggested · training off
                </div>
              </div>
            </div>
          </UcAppFrame>
        </div>
        <div className="db-uc-copy">
          <span className="eyebrow">CIMs & teasers</span>
          <h2>Section turns ready for a VP pass</h2>
          <p className="lead">Narrative + sourcing, same day</p>
          <p>
            Blank-page CIM sections burn associate nights. In Clarvy the brief, source pack, and draft live in one
            Vault thread under the deal room. Private AI proposes structure and pulls candidate metrics; the student
            rewrites in banker voice, attaches sourcing notes, and submits for your markup. Typical section turn:
            8–24 hours — without a Word file bouncing through email.
          </p>
          <ul className="db-uc-points">
            <li>Section-level deliverables inside the deal room</li>
            <li>Sourcing notes tied to each claim</li>
            <li>Watermark shows the working analyst’s .edu</li>
          </ul>
        </div>
      </section>

      <section className="db-uc-feature rev">
        <div className="db-uc-viz">
          <UcAppFrame title="Vault · Model audit · Harbor LBO">
            <div className="db-uc-vault">
              <aside className="db-uc-vault-files">
                <div className="hd">Deliverables <em>0/1</em></div>
                <button type="button" className="row on"><i className="st work" /><span>LBO audit pass<small>2 findings · 1 advisory</small></span></button>
                <div className="hd">Firm materials <em>1</em></div>
                <button type="button" className="row file"><span>Harbor_LBO_v7.xlsx<small>Locked · no download</small></span></button>
                <div className="hd">Submitted</div>
                <button type="button" className="row file"><span>Change_log.pdf<small>Attached · Henry Liu</small></span></button>
              </aside>
              <div className="db-uc-vault-view">
                <div className="banner">Secure interface · Sources destroy when room closes</div>
                <figure className="shot">
                  <img src="/talent/uc-model-audit.jpg" alt="" />
                </figure>
              </div>
            </div>
          </UcAppFrame>
        </div>
        <div className="db-uc-copy">
          <span className="eyebrow">Model audits</span>
          <h2>Formula checks with a change log you can trust</h2>
          <p className="lead">Catch it before IC — inside Clarvy</p>
          <p>
            Upload the operating or LBO model to Firm materials. Clarvy’s private tooling surfaces circularity,
            hardcoded drivers, and broken links; a matched analyst confirms each finding, applies fixes, and writes
            a change log you open beside the workbook in Vault. No USB sticks, no “final_v7_REAL.xlsx” on a laptop.
            Most audits wrap in 2–6 hours.
          </p>
          <ul className="db-uc-points">
            <li>Findings triage with Fixed / Flagged / Clear</li>
            <li>Change log retained with the engagement</li>
            <li>Sources destroyed when you close the room</li>
          </ul>
        </div>
      </section>

      <section className="db-uc-flow">
        <h2>How a request moves through Clarvy</h2>
        <p className="db-uc-flow-sub">The same shell you see in the product — Home, Deal rooms, Vault — end to end.</p>
        <div className="db-uc-flow-grid">
          <article>
            <div className="viz v1" aria-hidden="true">
              <div className="orb">
                <span>Scope</span>
                <i /><i /><i /><i /><i />
              </div>
            </div>
            <h3>1 · Scope in minutes</h3>
            <p>Pick a workstream, codename, and deadline in New request. Attach files — they lock in the Vault on submit. Company names never enter the room.</p>
          </article>
          <article>
            <div className="viz v2" aria-hidden="true">
              <div className="match">
                <img src="/talent/avatars/sofia-chen.jpg" alt="" />
                <img src="/talent/avatars/david-okafor.jpg" alt="" />
                <img src="/talent/avatars/aisha-patel.jpg" alt="" />
                <em>3 matched</em>
              </div>
            </div>
            <h3>2 · Match, don’t post</h3>
            <p>Three .edu-verified analysts with scores on workstream and prior reviews. You send one offer. No job boards, no bidding wars.</p>
          </article>
          <article>
            <div className="viz v3" aria-hidden="true">
              <div className="speed">
                <b>3.4h</b>
                <span>median draft</span>
                <small>AI-assisted · Vault</small>
              </div>
            </div>
            <h3>3 · Work in the Vault</h3>
            <p>Private no-train models accelerate the first pass. Students deliver inside the watermarked viewer — your compliance posture stays intact.</p>
          </article>
          <article>
            <div className="viz v4" aria-hidden="true">
              <div className="alert">
                <strong>Draft ready</strong>
                <span>Nightjar comps · Review in Vault</span>
              </div>
            </div>
            <h3>4 · Review in-product</h3>
            <p>Open the deliverable, mark reviewed, close the engagement. Sources are scheduled for destruction; the audit trail stays with the room.</p>
          </article>
        </div>
      </section>

      <section className="db-section db-uc-all">
        <div className="db-section-head">
          <div>
            <span className="k">All workstreams</span>
            <h2>Scoped out of the box.</h2>
          </div>
          <p>
            Six repeatable deliverables your team already scopes by hand. Clarvy’s product — deal rooms, matching,
            Vault, and review — is the same surface for every workstream. Times below assume Vault assist.
          </p>
        </div>
        <div className="db-use-grid">
          {USE_CASES.map((u) => (
            <article key={u.t} className="db-use">
              <span className="ic"><MIc name={u.icon} size={17} /></span>
              <h3>{u.t}</h3>
              <p>{u.p}</p>
              <div className="meta">{u.tags.map((t) => <span key={t}>{t}</span>)}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="db-section tight">
        <div className="db-section-head">
          <div>
            <span className="k">Fit</span>
            <h2>Who it’s for.</h2>
          </div>
          <p>Boutique M&A and restructuring shops, middle-market groups at larger banks, and sponsor-coverage teams that need elastic capacity without a new vendor review.</p>
        </div>
        <div className="db-stats">
          <div className="db-stat"><b>2–6h</b><span>Typical pitch / comps draft</span></div>
          <div className="db-stat"><b>3</b><span>Matched analysts per request</span></div>
          <div className="db-stat"><b>25</b><span>Participating universities</span></div>
          <div className="db-stat"><b>0</b><span>Files that leave the Vault</span></div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}

function FirmsPage() {
  return (
    <>
      <PageHero
        k="For firms"
        title="An NDA-bound bench your compliance team already approved."
        sub="Open a deal room, get three matched analysts, and receive watermarked deliverables. No new vendor paperwork — the mutual NDA is signed before anything is uploaded."
        ctas={<><Link to="/book-demo" className="db-btn primary lg">Talk to us</Link><Link to="/login" className="db-btn secondary lg">Join waitlist</Link></>}
      />
      <section className="db-section">
        <div className="db-feat-grid three">
          <article className="db-feat"><div className="db-feat-body plain"><h3>Scope in minutes</h3><p>Pick a workstream, codename and deadline. Attach the file — it’s locked in the Vault on submit.</p></div></article>
          <article className="db-feat"><div className="db-feat-body plain"><h3>Match, don’t post</h3><p>We surface three cleared analysts with match scores. You send one offer. No job boards, no bidding.</p></div></article>
          <article className="db-feat"><div className="db-feat-body plain"><h3>Review in-product</h3><p>Drafts land in your Vault. Mark reviewed, close the engagement, sources are destroyed.</p></div></article>
        </div>
      </section>
      <section className="db-section">
        <div className="db-split">
          <div>
            <h3>Why students, and why now</h3>
            <p>Credentials used to be the bottleneck for IB-grade work. With private AI tooling and a tight scope, a verified Top-25 student produces an institutional-quality first pass — and a bank pays for throughput, not a title.</p>
            <ul>
              <li>Enrollment verified by .edu, re-checked each term</li>
              <li>Vault-trained before the first engagement</li>
              <li>Track record built from your reviews</li>
            </ul>
            <blockquote className="db-trust-card" style={{ marginTop: 16, background: 'var(--m-surface)', borderColor: 'var(--m-border)', color: 'var(--m-ink)' }}>
              <p style={{ opacity: 1, color: 'var(--m-ink-2)' }}>“{QUOTE_TALENT}”</p>
            </blockquote>
          </div>
          <div className="db-visual">
            <div className="t">Engagement · Project Nightjar <span>closed</span></div>
            <div className="ln"><b>Requested</b><span className="r">Mon 18:40</span></div>
            <div className="ln"><b>Offer accepted</b><span className="r">Mon 19:05</span></div>
            <div className="ln"><b>Draft delivered</b><span className="r">Tue 08:15</span></div>
            <div className="ln"><b>Reviewed & closed</b><span className="r g">Tue 09:30</span></div>
            <div className="ln"><b>Sources destroyed</b><span className="r g">Tue 09:30</span></div>
          </div>
        </div>
      </section>
      <TrustBand />
      <CtaBand title="Staff your next deck from the bench." sub="Book a 20-minute demo, or request access and sign the NDA today." />
    </>
  );
}

/** Real crest / mark assets (not text wordmarks). */
const SCHOOL_LOGO: Record<string, string> = {
  harvard: '/talent/schools/harvard-crest.svg',
  stanford: '/talent/schools/stanford-crest.svg',
  mit: '/talent/schools/mit-logo.svg',
  upenn: '/talent/schools/upenn-crest.svg',
  columbia: '/talent/schools/columbia-crest.svg',
  uchicago: '/talent/schools/uchicago-crest.svg',
  duke: '/talent/schools/duke-crest.svg',
  berkeley: '/talent/schools/berkeley-crest.svg',
  umich: '/talent/schools/umich-crest.svg',
  nd: '/talent/schools/nd-crest.svg',
  princeton: '/talent/schools/princeton-crest.svg',
};

const STUDENT_LOGOS = [
  { id: 'harvard', label: 'Harvard', src: SCHOOL_LOGO.harvard },
  { id: 'stanford', label: 'Stanford', src: SCHOOL_LOGO.stanford },
  { id: 'mit', label: 'MIT', src: SCHOOL_LOGO.mit, wide: true },
  { id: 'princeton', label: 'Princeton', src: SCHOOL_LOGO.princeton },
  { id: 'upenn', label: 'UPenn', src: SCHOOL_LOGO.upenn },
  { id: 'columbia', label: 'Columbia', src: SCHOOL_LOGO.columbia },
  { id: 'uchicago', label: 'UChicago', src: SCHOOL_LOGO.uchicago },
  { id: 'duke', label: 'Duke', src: SCHOOL_LOGO.duke },
  { id: 'berkeley', label: 'Berkeley', src: SCHOOL_LOGO.berkeley },
  { id: 'umich', label: 'Michigan', src: SCHOOL_LOGO.umich },
  { id: 'nd', label: 'Notre Dame', src: SCHOOL_LOGO.nd },
];

function StudentsPage() {
  return (
    <div className="db-students">
      <section className="db-students-hero">
        <span className="db-students-k">Students at Top-25 universities</span>
        <div className="db-students-hero-row">
          <h1>Free access to real deal work — before you graduate.</h1>
          <div className="db-students-hero-side">
            <p>
              Free for .edu students at participating schools. Get matched to scoped deal work and paid per reviewed engagement.
            </p>
            <Link to="/login" className="db-btn primary lg">Join waitlist</Link>
          </div>
        </div>
        <figure className="db-students-hero-media">
          <img src="/talent/students-hero.jpg" alt="" />
        </figure>
      </section>

      <section className="db-students-logos" aria-label="Participating schools">
        <p className="db-students-logos-k">Participating schools</p>
        <ul className="db-students-logo-row">
          {STUDENT_LOGOS.map((s) => (
            <li key={s.id} className={s.wide ? 'wide' : undefined}>
              <img src={s.src} alt={s.label} />
            </li>
          ))}
        </ul>
        <p className="db-students-logos-more">
          + {TOP_25_SCHOOLS.length - STUDENT_LOGOS.length} more.{' '}
          <Link to="/schools">See the full list</Link>
        </p>
      </section>

      <CtaBand title="Join the bench." cta="Join waitlist" to="/login" />
    </div>
  );
}

function SchoolsPage() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<ReturnType<typeof validateStudentEmail> | null>(null);
  return (
    <div className="db-schools">
      <section className="db-schools-hero">
        <span className="db-schools-k">Participating schools</span>
        <div className="db-schools-hero-row">
          <div className="db-schools-hero-copy">
            <h1>The Top-25 list.</h1>
            <p>
              Clarvy is open to actively enrolled students at these universities. Sign up with your school email —
              we verify the domain and confirm the inbox before an account is created.
            </p>
          </div>
          <Link to="/login" className="db-btn primary lg">Join waitlist</Link>
        </div>
      </section>

      <section className="db-schools-check-wrap">
        <div className="db-schools-check">
          <div className="db-schools-check-copy">
            <h2>Is my school participating?</h2>
            <p>Paste your university email. Domain check only — nothing is stored.</p>
          </div>
          <form
            className="db-schools-check-form"
            onSubmit={(e) => {
              e.preventDefault();
              setRes(validateStudentEmail(q));
            }}
          >
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="you@school.edu" aria-label="University email" />
            <button type="submit" className="db-btn primary">Check</button>
          </form>
        </div>
        {res ? (
          res.ok ? (
            <div className="db-schools-result ok">
              <strong>{res.school.name}</strong> is participating.{' '}
              <Link to="/login">Join waitlist →</Link>
            </div>
          ) : (
            <div className="db-schools-result no">{res.message}</div>
          )
        ) : null}
      </section>

      <section className="db-schools-list" aria-label="Top 25 universities">
        <ul className="db-schools-grid">
          {TOP_25_SCHOOLS.map((s) => {
            const logo = SCHOOL_LOGO[s.id];
            return (
              <li key={s.id} className="db-schools-card">
                <div className={`db-schools-mark${s.id === 'mit' ? ' wide' : ''}`}>
                  {logo ? (
                    <img src={logo} alt="" />
                  ) : (
                    <span className="db-schools-mark-text">{s.short}</span>
                  )}
                </div>
                <div className="db-schools-meta">
                  <b>{s.name}</b>
                  <span>@{s.domains[0]}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="db-schools-foot">
        <div>
          <h3>Not listed yet?</h3>
          <p>We onboard schools in cohorts based on student demand and firm coverage. Join the waitlist and we’ll notify you when yours opens.</p>
        </div>
        <Link to="/login" className="db-btn primary">Join waitlist</Link>
      </section>

      <CtaBand title="Verified in under two minutes." cta="Join waitlist" to="/login" />
    </div>
  );
}

function SecurityPage() {
  return (
    <>
      <PageHero
        k="Trust & security"
        title="Deal data never leaves the room."
        sub="Clarvy was designed around the question compliance asks first: where does the file go? The answer is nowhere. It stays in the Vault, in a watermarked viewer, on private no-train endpoints, until the firm closes the engagement."
        ctas={<><Link to="/nda" className="db-btn primary lg">Read the Vault NDA</Link><Link to="/book-demo" className="db-btn secondary lg">Talk to us</Link></>}
      />
      <TrustBand />
      <section className="db-section">
        <div className="db-split">
          <div>
            <h3>No-Train Privacy Lock</h3>
            <p>“{QUOTE_NO_TRAIN}”</p>
            <ul>
              <li>Private developer APIs only; training and retention disabled by contract</li>
              <li>No consumer chat tools anywhere in the workflow</li>
              <li>Sources destroyed on engagement close; deliverables retained only by the firm</li>
            </ul>
          </div>
          <div className="db-visual">
            <div className="t">Model routing <span>per request</span></div>
            <div className="ln"><b>Endpoint</b><span className="r">Private · enterprise</span></div>
            <div className="ln"><b>Training on inputs</b><span className="r x">Off</span></div>
            <div className="ln"><b>Retention</b><span className="r x">0 days</span></div>
            <div className="ln"><b>Source destruction</b><span className="r g">On close</span></div>
          </div>
        </div>
        <div className="db-split rev">
          <div>
            <h3>Ironclad Vault NDA</h3>
            <p>The moment a firm signs up, our system emails a mutual NDA. The upload button stays disabled until it is digitally signed. Every student signs the same terms during onboarding, before their first match.</p>
            <ul>
              <li>Mutual, auto-sent, e-signed — no redlines required to start</li>
              <li>Covers Clarvy and every analyst on the engagement</li>
              <li>Signed copy lives in your firm profile</li>
            </ul>
          </div>
          <div className="db-visual">
            <div className="t">Firm onboarding <span>Meridian Partners</span></div>
            <div className="ln"><b>Account created</b><span className="r g">Done</span></div>
            <div className="ln"><b>Mutual NDA emailed</b><span className="r g">Auto</span></div>
            <div className="ln"><b>Digitally signed</b><span className="r g">Done</span></div>
            <div className="ln"><b>Upload enabled</b><span className="r g">Unlocked</span></div>
          </div>
        </div>
        <div className="db-split">
          <div>
            <h3>Verified, vault-trained talent</h3>
            <p>“{QUOTE_TALENT}”</p>
            <ul>
              <li>Enrollment verified by .edu domain and inbox confirmation</li>
              <li>Participating schools only — currently 25 universities</li>
              <li>Watermarked viewer: no download, no copy, no right-click</li>
            </ul>
          </div>
          <div className="db-visual">
            <div className="t">Secure viewer <span>s.chen@wharton.upenn.edu</span></div>
            <div className="doc">
              <div className="wm">{Array.from({ length: 12 }, (_, i) => <span key={i}>s.chen@wharton.upenn.edu</span>)}</div>
              <div className="l h" /><div className="l" /><div className="l w70" /><div className="l" /><div className="l w40" />
            </div>
          </div>
        </div>
      </section>
      <CtaBand title="Send this page to compliance." sub="Or book a call and we’ll walk them through the Vault live." />
    </>
  );
}

function PricingPage() {
  const [tab, setTab] = useState<'firms' | 'students'>('firms');
  const firmRows = [
    'Deal rooms & scoping',
    'Three matched analysts per request',
    'Ironclad Vault NDA',
    'No-Train Privacy Lock',
    'Watermarked viewer & audit trail',
    'Review SLAs',
    'Priority matching',
    'SSO & custom retention',
    'Named support contact',
    'MSA / enterprise terms',
  ];
  const studentRows = [
    'Verified .edu enrollment gate',
    'Matched offers from deal teams',
    'Work inside the Secure Vault',
    'AI coaching on scoped briefs',
    'Watermarked portfolio & standing',
    'Paid per reviewed engagement',
    'No student fees or take-rate',
    'Priority workstreams',
    'Multi-engagement track record',
    'Help center + chat support',
  ];
  const rows = tab === 'firms' ? firmRows : studentRows;
  const planCol = tab === 'firms' ? 'Enterprise' : 'Student';

  return (
    <>
      <section className="db-pricing-hero">
        <h1>Pricing</h1>
        <div className="db-pricing-cards">
          <article className="db-pricing-card">
            <div className="db-pricing-card-media">
              <img src="/talent/offer-firms.jpg" alt="" />
            </div>
            <h2>Clarvy for firms</h2>
            <p>
              Scoped deal work — pitch decks, CIMs, comps, model audits — staffed from a verified Top-25 bench and delivered inside the Vault.
            </p>
            <ul>
              <li>
                <i className="spark" aria-hidden="true" />
                {FIRM_PRICE ?? 'Scoped pricing per engagement'}
              </li>
            </ul>
            <Link to="/book-demo" className="db-pricing-card-cta">Talk to us <MIc name="arrow" size={13} /></Link>
          </article>
          <article className="db-pricing-card">
            <div className="db-pricing-card-media">
              <img src="/talent/offer-students.jpg" alt="" />
            </div>
            <h2>Clarvy for students</h2>
            <p>
              Free for participating .edu students when seats open. Build standing on real deal work, paid per reviewed engagement — never a fee to sit on the bench.
            </p>
            <ul>
              <li>
                <i className="spark" aria-hidden="true" />
                $0 forever · paid per engagement
              </li>
            </ul>
            <Link to="/login" className="db-pricing-card-cta">Join waitlist <MIc name="arrow" size={13} /></Link>
          </article>
        </div>
      </section>

      <section className="db-pricing">
        <h2 className="db-pricing-title">Features and access</h2>

        <div className="db-pricing-bar">
          <span className="filter">Filter by product</span>
          <div className="tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'firms'}
              className={tab === 'firms' ? 'on' : ''}
              onClick={() => setTab('firms')}
            >
              Clarvy for firms
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'students'}
              className={tab === 'students' ? 'on' : ''}
              onClick={() => setTab('students')}
            >
              Clarvy for students
            </button>
          </div>
        </div>

        <div className="db-feat-table db-feat-table--single" role="table">
          <div className="db-feat-table-hd" role="row">
            <span role="columnheader">Feature</span>
            <span role="columnheader">{planCol}</span>
          </div>
          {rows.map((feature) => (
            <div className="db-feat-table-rw" role="row" key={feature}>
              <span role="cell">{feature}</span>
              <span role="cell" className="cell">
                <i className="ck" aria-label="Included" />
              </span>
            </div>
          ))}
        </div>
      </section>
      <CtaBand title="See what Clarvy can do for your team" />
    </>
  );
}

function CustomersPage() {
  return (
    <>
      <PageHero
        k="Customers"
        title="Built with deal teams, not for them."
        sub="Clarvy is in pilot with a small group of boutique advisory firms and middle-market groups. Design partners shape the workstreams, the Vault, and the review flow."
        ctas={<><Link to="/book-demo" className="db-btn primary lg">Talk to us</Link></>}
      />
      <section className="db-section">
        <div className="db-feat-grid three">
          <article className="db-feat"><div className="db-feat-body plain"><h3>Boutique M&A advisory</h3><p>Overflow pitch decks and comps refreshes during live processes. Median first-draft turnaround: 14 hours.</p></div></article>
          <article className="db-feat"><div className="db-feat-body plain"><h3>Middle-market coverage group</h3><p>Weekly screening long-lists and CIM section rewrites, staffed from the same three analysts each time.</p></div></article>
          <article className="db-feat"><div className="db-feat-body plain"><h3>Restructuring boutique</h3><p>Model audits and data-room prep ahead of lender outreach, with the audit trail attached to every deliverable.</p></div></article>
        </div>
      </section>
      <section className="db-quote">
        <div className="db-quote-inner">
          <div>
            <blockquote>“The NDA was signed before I’d finished setting up the room. That alone would have taken our legal team three weeks with any other vendor.”</blockquote>
            <div className="who"><i>JW</i><span><b>Jane Whitfield</b>Partner, Meridian Partners · Design partner (pilot)</span></div>
          </div>
          <div className="db-quote-panel">
            <h4>Pilot shape</h4>
            <p>Two to four weeks. One or two workstreams. A named contact on our side and a review SLA. You keep every deliverable; we destroy every source.</p>
            <Link to="/book-demo" className="db-btn secondary">Talk to us <MIc name="arrow" size={13} /></Link>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}

function AboutPage() {
  return (
    <div className="db-about">
      <section className="db-about-hero">
        <div className="db-about-hero-row">
          <h1>Giving every student a real shot at finance.</h1>
          <p>
            After building a community of 90K+ students and professionals, one pattern was impossible to ignore:
            talent is everywhere — opportunity isn’t. Clarvy is the layer that finally connects them.
          </p>
        </div>
        <figure className="db-about-hero-media">
          <img src="/talent/about-hero.jpg" alt="" />
        </figure>
      </section>

      <section className="db-about-letter">
        <div className="db-about-letter-main">
          <h2>Letter from Bryan</h2>
          <div className="db-about-letter-body">
            <p>
              After gaining a social media following of over 90K+, teaching students about finance and recruiting,
              and talking with professionals and students every week, I noticed something that wouldn’t leave me alone.
              So many students wanted to pursue finance — and their dreams — but never had a shot, because they didn’t
              have the experience on paper.
            </p>
            <p>
              I felt the same way until someone gave me a chance. That chance eventually led to my first offer.
              It wasn’t a résumé line that opened the door. It was a person who trusted me with real work.
            </p>
            <p>
              That’s why I built Clarvy: so students can collaborate with firms on scoped deal work, prove what they
              can do inside a secure vault, and earn the experience that used to require knowing the right person —
              or already having the internship that gets you the next one.
            </p>
            <p>
              Firms get overflow capacity from a verified Top-25 bench. Students get a fair shot. Everyone works in
              a room built for trust. That’s the company.
            </p>
          </div>
        </div>
      </section>

      <section className="db-about-why">
        <h2>Why Clarvy exists</h2>
        <div className="db-about-why-cols">
          <p>
            Finance recruiting still runs on who you already know and what you’ve already done. Students without a
            first seat never get the work that would earn them one — no matter how sharp they are.
          </p>
          <p>
            Firms, meanwhile, drown in overflow: pitch decks, CIMs, comps, model checks. The work is real. The
            capacity isn’t. What’s missing is a trusted way to put verified talent on scoped tasks.
          </p>
          <p>
            Clarvy is that bridge — deal rooms, a Top-25 bench, and a vault where students and firms collaborate
            without files ever leaving the room. One chance, then another, then a career.
          </p>
        </div>
      </section>

      <CtaBand title="Work with us." sub="We’re a small team. Reach out and a founder replies." />
    </div>
  );
}

function HelpPage() {
  return (
    <>
      <PageHero k="Help center" title="Answers, fast." sub="Common questions from students and firms. Can’t find it? Contact us and a human replies within one business day." center />
      <section className="db-section">
        <div className="db-faq" style={{ marginTop: 0 }}>
          <h3>Students</h3>
          <details><summary>Who is eligible?</summary><p>Actively enrolled students at one of the 25 participating four-year universities. You must sign up with that school’s .edu (or listed school domain) and confirm the code we email to that inbox.</p></details>
          <details><summary>My school isn’t listed.</summary><p>We add schools in cohorts. Use the “Request my school” link on the schools page and we’ll notify you when yours opens.</p></details>
          <details><summary>Do I get paid?</summary><p>Yes. Every offer shows the payout for that scope. It’s released after the firm marks your deliverable reviewed.</p></details>
          <details><summary>Can I download the files I work on?</summary><p>No. All work happens inside the watermarked Vault viewer. This is what lets firms trust the bench — and it protects you too.</p></details>
          <details><summary>What happens when I graduate?</summary><p>Enrollment is re-checked each term. After graduation your account converts to alumni status and you keep your track record, but matching pauses.</p></details>
        </div>
        <div className="db-faq">
          <h3>Firms</h3>
          <details><summary>How fast can we start?</summary><p>Create a firm account, sign the auto-emailed mutual NDA, and lock your first request. Most pilots see a first draft within 24 hours.</p></details>
          <details><summary>Who sees our files?</summary><p>Only the single analyst you send an offer to, inside the watermarked viewer, after accepting. Sources are destroyed when you close the engagement.</p></details>
          <details><summary>Is any of our data used to train models?</summary><p>No. {QUOTE_NO_TRAIN}</p></details>
          <details><summary>Can we request the same analyst again?</summary><p>Yes. Connected analysts appear first in matching for future requests from your firm.</p></details>
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link to="/contact" className="db-btn primary lg">Contact support</Link>
        </div>
      </section>
    </>
  );
}

function ContactPage({ demo }: { demo?: boolean }) {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [firm, setFirm] = useState('');
  const [topic, setTopic] = useState(demo ? 'Talk to us' : 'General question');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => setTopic(demo ? 'Talk to us' : 'General question'), [demo]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !email.trim()) return setErr('Add your name and email.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr('Enter a valid email address.');
    if (isSupabaseConfigured) {
      const body = [
        topic ? `Topic: ${topic}` : '',
        firm.trim() ? `Firm/school: ${firm.trim()}` : '',
        msg.trim(),
      ].filter(Boolean).join('\n');
      const { error } = await supabase.from('contact_messages').insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        message: body || '(no message)',
        from_site: 'clarvy',
      });
      if (error) {
        console.error('[clarvy contact]', error);
        return setErr('Could not send. Email partners@clarvy.com directly.');
      }
    }
    setSent(true);
  }

  return (
    <>
      <PageHero
        k={demo ? 'Talk to us' : 'Contact'}
        title={demo ? 'See the Vault live in 20 minutes.' : 'Talk to a human.'}
        sub={demo ? 'We’ll scope your first request on the call and sign the NDA the same day.' : 'Questions about eligibility, pilots, security or anything else — a founder replies within one business day.'}
      />
      <section className="db-section">
        <div className="db-contact">
          <div className="db-contact-side">
            <h3>What to expect</h3>
            <p>{demo ? 'A short walkthrough of deal rooms, matching and the secure viewer, then a scoped quote for your first engagement.' : 'Pick a topic so we route you to the right person. Students: eligibility questions go fastest with your .edu in the email field.'}</p>
            <div className="box"><b>Firms & pilots</b><span>partners@clarvy.com</span></div>
            <div className="box"><b>Students & eligibility</b><span>students@clarvy.com</span></div>
            <div className="box"><b>Security & compliance</b><span>security@clarvy.com</span></div>
          </div>
          <div className="db-form">
            {sent ? (
              <div className="db-sent">
                <div className="ic"><MIc name="check" size={18} /></div>
                <h4>Got it — we’ll be in touch.</h4>
                <p>{demo ? 'Expect a calendar link within one business day.' : 'Expect a reply within one business day.'}</p>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3>{demo ? 'Talk to us' : 'Send a message'}</h3>
                <p className="lead">No sales sequence. One reply, from a person.</p>
                {err ? <div className="db-err">{err}</div> : null}
                <div className="db-field-row">
                  <div className="db-field"><label htmlFor="c-name">Name</label><input id="c-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
                  <div className="db-field"><label htmlFor="c-email">Email</label><input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@firm.com" /></div>
                </div>
                <div className="db-field-row">
                  <div className="db-field"><label htmlFor="c-firm">Firm / school</label><input id="c-firm" value={firm} onChange={(e) => setFirm(e.target.value)} /></div>
                  <div className="db-field">
                    <label htmlFor="c-topic">Topic</label>
                    <TbSelect
                      id="c-topic"
                      value={topic}
                      onChange={setTopic}
                      options={[
                        'Talk to us',
                        'Start a pilot',
                        'Security & compliance',
                        'Student eligibility',
                        'Request my school',
                        'General question',
                      ].map((v) => ({ value: v, label: v }))}
                    />
                  </div>
                </div>
                <div className="db-field"><label htmlFor="c-msg">Message</label><textarea id="c-msg" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder={demo ? 'What are you looking to staff first?' : ''} /></div>
                <button type="submit" className="db-btn primary block">{demo ? 'Request demo' : 'Send'}</button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function LegalPage({ kind }: { kind: 'privacy' | 'terms' | 'nda' }) {
  const title = kind === 'privacy' ? 'Privacy policy' : kind === 'terms' ? 'Terms of service' : 'Ironclad Vault NDA — summary';
  return (
    <>
      <PageHero k="Legal" title={title} sub="" center />
      <div className="db-prose">
        <div className="updated">Last updated October 2026 · Pilot terms</div>
        {kind === 'privacy' ? (
          <>
            <h2>What we collect</h2>
            <p>Account details (name, email, school or firm), engagement metadata (codenames, workstreams, timestamps) and product usage. We do not collect the contents of deal files for any purpose other than rendering them inside the Vault for the engagement.</p>
            <h2>Deal data</h2>
            <p>{QUOTE_NO_TRAIN} Sources are destroyed when the firm closes an engagement. Deliverables are retained by the firm.</p>
            <h2>Student verification</h2>
            <p>We check the domain of your email against the participating-school list and confirm you control the inbox. We do not contact your university and we do not store the verification code.</p>
            <h2>Sharing</h2>
            <p>We share engagement metadata between the firm and the single analyst on that engagement. We do not sell data. Subprocessors are limited to hosting, email delivery, payments and private model endpoints with training disabled.</p>
            <h2>Your rights</h2>
            <p>Export or delete your account at any time from your profile, or by emailing privacy@clarvy.com.</p>
          </>
        ) : kind === 'terms' ? (
          <>
            <h2>Eligibility</h2>
            <p>Student accounts are limited to individuals actively enrolled at a participating four-year university who register with that institution’s email. Firm accounts are limited to individuals acting on behalf of a business using a company email domain.</p>
            <h2>The Vault</h2>
            <p>All engagement materials are accessed exclusively through the Clarvy secure viewer. Attempting to download, copy, screenshot, transcribe or otherwise remove materials from the viewer is a material breach and results in immediate account termination.</p>
            <h2>Engagements and payment</h2>
            <p>Firms pay per engagement at the quoted amount. Students are paid the payout shown on the accepted offer once the firm marks the deliverable reviewed. Clarvy may withhold payment where the Vault terms have been breached.</p>
            <h2>Confidentiality</h2>
            <p>Every user is bound by the Ironclad Vault NDA, which is incorporated into these terms by reference.</p>
            <h2>Changes</h2>
            <p>These are pilot terms and may change with notice to your account email.</p>
          </>
        ) : (
          <>
            <p>The full mutual NDA is emailed automatically when a firm creates an account and must be digitally signed before upload is enabled. Students sign the same instrument during onboarding. This page summarises its effect; the signed copy in your profile controls.</p>
            <h2>Mutual</h2>
            <p>Both Clarvy and the firm are bound. Analysts are bound to Clarvy under identical terms, which flow through to every firm they serve.</p>
            <h2>Scope</h2>
            <p>All materials, codenames, and metadata placed in a deal room are Confidential Information, regardless of marking.</p>
            <h2>Handling</h2>
            <p>Confidential Information is accessed only inside the secure viewer. No download, copying, screenshotting, or transcription. {QUOTE_NO_TRAIN}</p>
            <h2>Destruction</h2>
            <p>Sources are destroyed when the firm closes the engagement. Certificates of destruction are available on request.</p>
            <h2>Term</h2>
            <p>Obligations survive for five years after the last engagement, and indefinitely for trade secrets.</p>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------
   Auth
------------------------------------------------------------------- */

function CodeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  function set(i: number, ch: string) {
    const clean = ch.replace(/\D/g, '');
    if (clean.length > 1) {
      // paste
      const next = (value.slice(0, i) + clean).slice(0, 6);
      onChange(next);
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    const arr = digits.slice();
    arr[i] = clean;
    const next = arr.join('').slice(0, 6);
    onChange(next);
    if (clean && i < 5) refs.current[i + 1]?.focus();
  }
  return (
    <div className="db-code">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={d}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

function StudentSignup({ onDone }: { onDone: (s: ClarvySession) => void }) {
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [year, setYear] = useState('Junior');
  const [major, setMajor] = useState('');
  const [enrolled, setEnrolled] = useState(false);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const live = useMemo(() => (email.includes('@') ? validateStudentEmail(email) : null), [email]);
  const isEdu = /\.edu$/i.test(email.trim()) || (live?.ok ?? false);
  const expected = demoVerificationCode(email);

  function submitForm(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr('Enter your full name.');
    const check = validateStudentEmail(email);
    if (!check.ok) return setErr(check.message);
    if (!major.trim()) return setErr('Add your major or concentration.');
    if (!enrolled) return setErr('Confirm you are actively enrolled at a participating four-year university.');
    setStep('verify');
  }

  function submitCode(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (code !== expected) return setErr('That code doesn’t match. Check the email we sent to your .edu inbox.');
    const check = validateStudentEmail(email);
    if (!check.ok) return setErr(check.message);
    const session = studentFromForm({ name, email, year, major, school: check.school });
    saveSession(session);
    onDone(session);
  }

  if (step === 'verify') {
    return (
      <div className="db-auth">
        <form className="db-auth-card" onSubmit={submitCode}>
          <h1>Confirm your .edu inbox</h1>
          <p className="lead">We emailed a 6-digit code to <b>{email.trim().toLowerCase()}</b>. Only an enrolled student can read that inbox — that’s the check.</p>
          {live?.ok ? <div className="db-ok"><MIc name="check" size={14} /> {live.school.name} · participating</div> : null}
          {err ? <div className="db-err">{err}</div> : null}
          <CodeInput value={code} onChange={setCode} />
          <div className="db-demo-note">Demo environment — no email is actually sent. Your code is <code>{expected}</code>.</div>
          <button type="submit" className="db-btn primary block" disabled={code.length !== 6}>Verify & create account</button>
          <div className="db-auth-foot">
            Wrong address? <button type="button" onClick={() => { setStep('form'); setCode(''); setErr(null); }}>Go back</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="db-auth">
      <form className="db-auth-card" onSubmit={submitForm}>
        <h1>Create your student account</h1>
        <p className="lead">Free forever. Open to actively enrolled students at 25 participating universities.</p>
        <ul className="db-auth-rules" aria-label="Eligibility checks">
          <li className={isEdu ? 'ok' : ''}><i />University .edu email</li>
          <li className={live?.ok ? 'ok' : ''}><i />{live?.ok ? `Participating school · ${live.school.short}` : 'Participating Top-25 school'}</li>
          <li className={enrolled ? 'ok' : ''}><i />Actively enrolled, four-year program</li>
        </ul>
        {err ? <div className="db-err">{err}</div> : null}
        {live && !live.ok ? <div className="db-err">{live.message}</div> : null}
        <div className="db-field">
          <label htmlFor="s-name">Full name</label>
          <input id="s-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="db-field">
          <label htmlFor="s-email">University email</label>
          <input id="s-email" type="email" placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          <div className="hint">We check the domain against the participating list and email a code to confirm the inbox.</div>
        </div>
        <div className="db-field-row">
          <div className="db-field">
            <label htmlFor="s-year">Year</label>
            <TbSelect
              id="s-year"
              value={year}
              onChange={setYear}
              options={['Freshman', 'Sophomore', 'Junior', 'Senior', 'Master’s'].map((v) => ({ value: v, label: v }))}
            />
          </div>
          <div className="db-field">
            <label htmlFor="s-major">Major / concentration</label>
            <input id="s-major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Finance" />
          </div>
        </div>
        <label className="db-check">
          <input type="checkbox" checked={enrolled} onChange={(e) => setEnrolled(e.target.checked)} />
          <span>I am actively enrolled at a participating four-year university and will work only inside the secure Vault. I agree to the <Link to="/terms" style={{ textDecoration: 'underline' }}>Terms</Link> and the <Link to="/nda" style={{ textDecoration: 'underline' }}>Vault NDA</Link>.</span>
        </label>
        <button type="submit" className="db-btn primary block">Send verification code</button>
        <div className="db-auth-foot">
          Firm? <Link to="/book-demo">Talk to us</Link> · <Link to="/login">Join waitlist</Link>
        </div>
      </form>
    </div>
  );
}

function FirmSignup({ onDone }: { onDone: (s: ClarvySession) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [firm, setFirm] = useState('');
  const [title, setTitle] = useState('');
  const [agree, setAgree] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const live = useMemo(() => (email.includes('@') ? validateFirmEmail(email) : null), [email]);

  function submit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !firm.trim() || !title.trim()) return setErr('Fill in your name, firm and title.');
    const check = validateFirmEmail(email);
    if (!check.ok) return setErr(check.message);
    if (!agree) return setErr('Acknowledge the mutual NDA to continue.');
    const session = firmFromForm({ name, email, firm, title });
    session.ndaSignedAt = new Date().toISOString();
    saveSession(session);
    onDone(session);
  }

  return (
    <div className="db-auth">
      <form className="db-auth-card" onSubmit={submit}>
        <h1>Request firm access</h1>
        <p className="lead">Open deal rooms and staff them from the verified bench. A mutual NDA is emailed on signup; upload unlocks once it’s signed.</p>
        {err ? <div className="db-err">{err}</div> : null}
        {live && !live.ok ? <div className="db-err">{live.message}</div> : null}
        {live?.ok ? <div className="db-ok"><MIc name="check" size={14} /> Work domain · @{live.domain}</div> : null}
        <div className="db-field"><label htmlFor="f-name">Your name</label><input id="f-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
        <div className="db-field">
          <label htmlFor="f-email">Work email</label>
          <input id="f-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@firm.com" autoComplete="email" />
          <div className="hint">Company domains only — personal mailboxes are rejected.</div>
        </div>
        <div className="db-field-row">
          <div className="db-field"><label htmlFor="f-firm">Firm</label><input id="f-firm" value={firm} onChange={(e) => setFirm(e.target.value)} placeholder="Meridian Partners" /></div>
          <div className="db-field"><label htmlFor="f-title">Title</label><input id="f-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VP, M&A" /></div>
        </div>
        <label className="db-check">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>Send the mutual <Link to="/nda" style={{ textDecoration: 'underline' }}>Ironclad Vault NDA</Link> to this address for e-signature. I understand uploads stay disabled until it’s signed. (Demo: signed instantly.)</span>
        </label>
        <button type="submit" className="db-btn primary block">Create firm account</button>
        <div className="db-auth-foot">
          Student? <Link to="/login">Join waitlist</Link> · <Link to="/book-demo">Talk to us</Link>
        </div>
      </form>
    </div>
  );
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [waitlisted, setWaitlisted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function joinWaitlist(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const msg = await joinClarvyWaitlist(email, { role: 'student', source: 'login' });
    setBusy(false);
    if (msg) {
      setErr(msg);
      return;
    }
    setWaitlisted(true);
  }

  return (
    <div className="db-waitlist">
      <div className="db-waitlist-bg" aria-hidden="true">
        <img src="/talent/story-room.jpg" alt="" />
      </div>
      <div className="db-waitlist-shade" aria-hidden="true" />

      <Link to="/" className="db-waitlist-mark">CLARVY</Link>

      <div className="db-waitlist-main">
        <span className="db-waitlist-badge">Waitlist only</span>
        <h1>
          The talent layer for <em>finance</em> is opening soon.
        </h1>
        <p>
          Clarvy isn’t open for self-serve signup yet. Join the waitlist and we’ll email you when seats open
          for your school or firm.
        </p>

        {waitlisted ? (
          <div className="db-waitlist-done">
            <p>You’re on the waitlist. We’ll email <strong>{email.trim()}</strong> when a seat opens.</p>
            <button type="button" className="db-waitlist-ghost" onClick={() => { setWaitlisted(false); setEmail(''); }}>
              Use a different email
            </button>
          </div>
        ) : (
          <form className="db-waitlist-form" onSubmit={joinWaitlist} noValidate>
            <input
              id="si-email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              aria-label="Email"
              disabled={busy}
            />
            <button type="submit" disabled={busy}>{busy ? 'Joining…' : 'Join waitlist'}</button>
          </form>
        )}
        {err ? <p className="db-waitlist-err">{err}</p> : null}

        <p className="db-waitlist-firm">
          Firm or bank? <Link to="/book-demo">Talk to us</Link>
        </p>
      </div>

      <div className="db-waitlist-logos" aria-label="Participating schools">
        {STUDENT_LOGOS.slice(0, 6).map((s) => (
          <img
            key={s.id}
            src={s.src}
            alt={s.label}
            className={[s.wide ? 'wide' : '', s.id === 'harvard' || s.id === 'mit' ? 'ink' : ''].filter(Boolean).join(' ') || undefined}
          />
        ))}
      </div>

      <p className="db-waitlist-legal">
        Clarvy’s <Link to="/terms">Terms</Link> and <Link to="/privacy">Privacy policy</Link> apply.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------
   Shell
------------------------------------------------------------------- */

export const MARKETING_PATHS = new Set([
  '/', '/product', '/use-cases', '/firms', '/students', '/schools', '/security', '/pricing', '/customers', '/about',
  '/help', '/contact', '/book-demo', '/privacy', '/terms', '/nda', '/login', '/signup', '/signup/firm',
]);

export function MarketingShell({
  path,
  session,
}: {
  path: string;
  session: ClarvySession | null;
  /** @deprecated Dashboard auth disabled — waitlist only. */
  onAuth?: (s: ClarvySession) => void;
}) {
  const isWaitlist = path === '/login' || path === '/signup';
  const isAuth = isWaitlist || path === '/signup/firm';
  void session;

  useEffect(() => {
    const titles: Record<string, string> = {
      '/': 'Clarvy — The talent layer for institutional finance',
      '/product': 'Product — Clarvy',
      '/use-cases': 'Use cases — Clarvy',
      '/firms': 'For firms — Clarvy',
      '/students': 'For students — Clarvy',
      '/schools': 'Participating schools — Clarvy',
      '/security': 'Trust & security — Clarvy',
      '/pricing': 'Pricing — Clarvy',
      '/customers': 'Customers — Clarvy',
      '/about': 'About — Clarvy',
      '/help': 'Help center — Clarvy',
      '/contact': 'Contact — Clarvy',
      '/book-demo': 'Talk to us — Clarvy',
      '/privacy': 'Privacy — Clarvy',
      '/terms': 'Terms — Clarvy',
      '/nda': 'Vault NDA — Clarvy',
      '/login': 'Join waitlist — Clarvy',
      '/signup': 'Join waitlist — Clarvy',
      '/signup/firm': 'Talk to us — Clarvy',
    };
    document.title = titles[path] ?? 'Clarvy';

    const href = '/talent/favicon.svg?v=1';
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon'][data-clarvy='1']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/svg+xml';
      link.dataset.clarvy = '1';
      document.head.appendChild(link);
    }
    link.href = href;
    document.querySelectorAll<HTMLLinkElement>("link[rel='icon']:not([data-clarvy])").forEach((el) => {
      el.remove();
    });
  }, [path]);

  let page: React.ReactNode;
  switch (path) {
    case '/': page = <HomePage />; break;
    case '/product': page = <ProductPage />; break;
    case '/use-cases': page = <UseCasesPage />; break;
    case '/firms': page = <FirmsPage />; break;
    case '/students': page = <StudentsPage />; break;
    case '/schools': page = <SchoolsPage />; break;
    case '/security': page = <SecurityPage />; break;
    case '/pricing': page = <PricingPage />; break;
    case '/customers': page = <CustomersPage />; break;
    case '/about': page = <AboutPage />; break;
    case '/help': page = <HelpPage />; break;
    case '/contact': page = <ContactPage />; break;
    case '/book-demo': page = <ContactPage demo />; break;
    case '/privacy': page = <LegalPage kind="privacy" />; break;
    case '/terms': page = <LegalPage kind="terms" />; break;
    case '/nda': page = <LegalPage kind="nda" />; break;
    case '/login':
    case '/signup':
      page = <LoginPage />;
      break;
    case '/signup/firm':
      page = <ContactPage demo />;
      break;
    default:
      page = (
        <PageHero
          k="404"
          title="That page doesn’t exist."
          sub="Try the product overview, or head back home."
          center
          ctas={<><button type="button" className="db-btn primary lg" onClick={() => navigate('/')}>Home</button><Link to="/product" className="db-btn secondary lg">Product</Link></>}
        />
      );
  }

  return (
    <div className={`db-mkt${isWaitlist ? ' db-mkt--signin' : ''}`}>
      {!isAuth ? <Announce /> : null}
      {!isWaitlist ? <MarketingNav path={path} session={session} /> : null}
      {page}
      {!isAuth ? <Footer /> : null}
    </div>
  );
}
