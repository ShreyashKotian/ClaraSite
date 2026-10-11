import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, useMatch } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useTheme } from "../theme/ThemeProvider";
import { ClaraMark, ClaraWordmark } from "./ClaraLogo";
import styles from "./Sidebar.module.css";

interface Props {
  isLive?: boolean;
}

const COLLAPSE_KEY = "sidebar-collapsed";

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

const NAV_LINKS = [
  { to: "/", end: true, label: "Dashboard", icon: <GridIcon /> },
  { to: "/live", label: "Live Calls", icon: <PhoneIcon /> },
  { to: "/knowledge", label: "Knowledge Base", icon: <BookIcon /> },
  { to: "/analytics", label: "Analytics", icon: <ChartIcon /> },
];

// The nav itself is identical on desktop and mobile — only where it renders
// differs: inline in the layout flow on desktop, or as an overlay drawer
// (portaled to <body> so it can't be clipped by the shell's overflow:hidden)
// on mobile. The drawer is never collapsed — it is already a deliberate,
// dismissable overlay, so icon-only would only make it harder to use.
export function Sidebar({ isLive = false }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readStoredCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  return (
    <>
      {/* In normal document flow (not fixed) so it pushes page content down
          instead of floating over it — only shown below 768px. */}
      <div className={styles.mobileTopbar}>
        <button
          type="button"
          className={styles.mobileMenuBtn}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
        <ClaraWordmark className={styles.mobileTopbarBrand} />
      </div>
      <SidebarPanel
        isLive={isLive}
        variant="inline"
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((was) => !was)}
      />
      {mobileOpen
        ? createPortal(
            <>
              <div className={styles.backdrop} onClick={() => setMobileOpen(false)} />
              <SidebarPanel isLive={isLive} variant="drawer" onNavigate={() => setMobileOpen(false)} />
            </>,
            document.body
          )
        : null}
    </>
  );
}

function SidebarPanel({
  isLive = false,
  variant,
  collapsed = false,
  onToggleCollapsed,
  onNavigate,
}: {
  isLive?: boolean;
  variant: "inline" | "drawer";
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onNavigate?: () => void;
}) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const onLiveRoute = useMatch({ path: "/live", end: true });

  return (
    <aside
      className={`${styles.sidebar} ${variant === "drawer" ? styles.sidebarDrawer : styles.sidebarInline}`}
      data-collapsed={collapsed}
      onClick={(e) => {
        if (onNavigate && (e.target as HTMLElement).closest("a,button")) onNavigate();
      }}
    >
      <div className={styles.brand}>
        <div className={styles.logo}>
          <ClaraMark size={36} />
        </div>
        <div className={styles.brandText}>
          <ClaraWordmark className={styles.brandName} />
          <span className={styles.brandSub}>Powered by HubCode</span>
        </div>
        {variant === "drawer" ? (
          <button type="button" className={styles.drawerCloseBtn} onClick={onNavigate} aria-label="Close menu">
            <CloseIcon />
          </button>
        ) : (
          <button
            type="button"
            className={styles.collapseBtn}
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <CollapseIcon />
            <span className={styles.navTip} aria-hidden="true">
              Expand sidebar
            </span>
          </button>
        )}
      </div>

      <nav
        className={styles.nav}
        aria-label="Main navigation"
        onClick={() => {
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: "DEMO_LOCK_SCROLL" }, "*");
            }
          } catch (_) {}
        }}
      >
        {NAV_LINKS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ""}`}
          >
            <NavBody
              icon={item.icon}
              label={item.label}
              badge={
                item.to === "/live" && isLive && onLiveRoute != null ? (
                  <span className={styles.liveDot} aria-label="live" />
                ) : null
              }
            />
          </NavLink>
        ))}
      </nav>

      <Link
        to="/live"
        className={styles.newSession}
        onClick={() => {
          try {
            if (window.parent && window.parent !== window) {
              window.parent.postMessage({ type: "DEMO_LOCK_SCROLL" }, "*");
            }
          } catch (_) {}
        }}
      >
        <PlusIcon />
        <span className={styles.newSessionLabel}>New Session</span>
        <span className={styles.navTip} aria-hidden="true">
          New Session
        </span>
      </Link>

      <div className={styles.navFooter}>
        <button
          type="button"
          className={`${styles.navItem} ${styles.navCompact} ${styles.themeToggle}`}
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <NavBody
            icon={theme === "dark" ? <SunIcon /> : <MoonIcon />}
            label={theme === "dark" ? "Light mode" : "Dark mode"}
          />
        </button>
        <div
          className={`${styles.navItem} ${styles.navCompact}`}
          title={collapsed ? undefined : (user?.email || "alex.sales@clara.ai")}
        >
          <NavBody
            icon={<UserPlusIcon />}
            label={user?.display_name || user?.email || "Alex Morgan"}
            hint={user?.display_name ? user.email : undefined}
          />
        </div>
        <NavPlaceholder icon={<GearIcon />} label="Settings" collapsed={collapsed} />
        <NavPlaceholder icon={<LifeRingIcon />} label="Support" collapsed={collapsed} />
      </div>

      <div className={styles.sidebarCopyright}>
        © 2026 ClaraAI
        <br />
        Powered by HubCode
      </div>
    </aside>
  );
}

/**
 * The inside of every nav row. Collapsed, the label is hidden from sight but
 * kept for screen readers, and that same text doubles as the hover tooltip —
 * so a row is named once and the two can never drift apart.
 */
function NavBody({
  icon,
  label,
  hint,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  badge?: React.ReactNode;
}) {
  return (
    <>
      <span className={styles.navIcon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.navLabel}>{label}</span>
      {badge}
      <span className={styles.navTip} aria-hidden="true">
        {label}
        {hint ? <span className={styles.navTipHint}>{hint}</span> : null}
      </span>
    </>
  );
}

function NavPlaceholder({
  icon,
  label,
  collapsed,
}: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.navItem} ${styles.navCompact} ${styles.navPlaceholder}`}
      disabled
      title={collapsed ? undefined : "Coming soon"}
    >
      <NavBody icon={icon} label={label} hint="Coming soon" />
    </button>
  );
}

function CollapseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  );
}


function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LifeRingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <line x1="4.93" y1="4.93" x2="9.17" y2="9.17" />
      <line x1="14.83" y1="14.83" x2="19.07" y2="19.07" />
      <line x1="14.83" y1="9.17" x2="19.07" y2="4.93" />
      <line x1="14.83" y1="9.17" x2="18.36" y2="5.64" />
      <line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
  );
}
