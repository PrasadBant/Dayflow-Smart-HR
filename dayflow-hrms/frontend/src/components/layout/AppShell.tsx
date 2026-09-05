import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  User as UserIcon,
  BadgeDollarSign,
  Users,
  LogOut,
  FolderOpen,
  Building2,
  Menu,
  Search,
  X as CloseIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../primitives/Badge';
import { Avatar } from '../primitives/Avatar';
import { CommandPalette, type CommandAction } from '../primitives/CommandPalette';
import '../../design/tokens.css';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const WORKSPACE_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={17} /> },
  { label: 'Attendance', path: '/attendance', icon: <Clock size={17} /> },
  { label: 'Leave', path: '/leave', icon: <CalendarDays size={17} /> },
  { label: 'Payroll', path: '/payroll', icon: <BadgeDollarSign size={17} /> },
  { label: 'Documents', path: '/documents', icon: <FolderOpen size={17} /> },
  { label: 'My Profile', path: '/profile', icon: <UserIcon size={17} /> },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Employees', path: '/employees', icon: <Users size={17} /> },
];

const ALL_NAV_ITEMS = [...WORKSPACE_ITEMS, ...ADMIN_ITEMS];

function currentSectionLabel(pathname: string): string {
  return ALL_NAV_ITEMS.find((item) => pathname.startsWith(item.path))?.label ?? 'Dayflow';
}

export const AppShell: React.FC = () => {
  const { user, employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const isHR = user?.role === 'HR';
  const displayName = employee ? `${employee.firstName} ${employee.lastName}` : user?.email || '';

  // Route changes (nav link clicks) should close the mobile slide-in panel;
  // otherwise it would stay open covering the page after navigating.
  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  // Ctrl/Cmd+K opens the command palette from anywhere in the app.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Every entry navigates to a real route this app already serves — no
  // fabricated search results, no action the palette can't actually carry
  // out. Each page owns its own real action (check in, request leave, etc.);
  // the palette's job is only to get the user there in one keystroke.
  const paletteActions: CommandAction[] = useMemo(() => {
    const pages: CommandAction[] = WORKSPACE_ITEMS.map((item) => ({
      id: `nav-${item.path}`,
      label: `Go to ${item.label}`,
      group: 'Pages',
      icon: item.icon,
      run: () => navigate(item.path),
    }));
    if (isHR) {
      pages.push({
        id: 'nav-employees',
        label: 'Go to Employees',
        group: 'Pages',
        icon: <Users size={17} />,
        run: () => navigate('/employees'),
      });
    }

    const actions: CommandAction[] = isHR
      ? [
          { id: 'action-review-leave', label: 'Review pending leave', group: 'Actions', icon: <CalendarDays size={17} />, run: () => navigate('/leave') },
          { id: 'action-search-employees', label: 'Search employees', group: 'Actions', icon: <Search size={17} />, run: () => navigate('/employees') },
        ]
      : [
          { id: 'action-check-in', label: 'Check in / check out', group: 'Actions', icon: <Clock size={17} />, run: () => navigate('/attendance') },
          { id: 'action-request-leave', label: 'Request leave', group: 'Actions', icon: <CalendarDays size={17} />, run: () => navigate('/leave') },
          { id: 'action-view-payroll', label: 'View payroll', group: 'Actions', icon: <BadgeDollarSign size={17} />, run: () => navigate('/payroll') },
        ];

    return [...actions, ...pages];
  }, [isHR, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.6875rem',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: isActive ? 600 : 400,
    color: isActive ? '#ffffff' : 'var(--color-slate-300)',
    backgroundColor: isActive ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
    borderLeft: `2px solid ${isActive ? 'var(--color-primary-400)' : 'transparent'}`,
    paddingLeft: 'calc(0.75rem - 2px)',
    transition: `background-color var(--transition-fast), color var(--transition-fast)`,
    textDecoration: 'none',
  });

  const sectionLabelStyle: React.CSSProperties = {
    padding: '0 0.75rem',
    marginTop: 'var(--space-lg)',
    marginBottom: 'var(--space-xs)',
    fontSize: '0.6875rem',
    fontWeight: 600,
    // slate-500 measured 3.75:1 against the dark sidebar background (axe
    // caught it) — under WCAG AA's 4.5:1 minimum. slate-400 clears it.
    color: 'var(--color-slate-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      {/* Mobile-only overlay behind the slide-in sidebar; tapping it closes the menu */}
      {isMobileNavOpen && (
        <div className="app-sidebar-overlay" onClick={() => setIsMobileNavOpen(false)} />
      )}

      {/* Fixed sidebar (desktop, >1024px) / slide-in panel (narrower, see tokens.css) */}
      <aside
        className={`app-sidebar${isMobileNavOpen ? ' app-sidebar-open' : ''}`}
        style={{
          width: '248px',
          backgroundColor: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 'var(--z-drawer)' as unknown as number,
        }}
      >
        {/* Brand */}
        <div style={{ padding: 'var(--space-md) var(--space-md) var(--space-sm)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Building2 size={17} color="#ffffff" />
          </div>
          <span style={{ font: 'var(--font-section-title)', color: '#ffffff', fontSize: 'var(--text-base)', letterSpacing: '-0.01em' }}>Dayflow</span>
          <button
            className="app-hamburger"
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close menu"
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.25rem', marginLeft: 'auto' }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ flexGrow: 1, padding: '0 var(--space-sm) var(--space-md)', overflowY: 'auto' }}>
          <div style={sectionLabelStyle}>Workspace</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
            {WORKSPACE_ITEMS.map((item) => (
              <NavLink key={item.path} to={item.path} style={({ isActive }) => navLinkStyle(isActive)}>
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>

          {isHR && (
            <>
              <div style={sectionLabelStyle}>Administration</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                {ADMIN_ITEMS.map((item) => (
                  <NavLink key={item.path} to={item.path} style={({ isActive }) => navLinkStyle(isActive)}>
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User footer */}
        <div style={{ padding: 'var(--space-md)', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <Avatar name={displayName} size="sm" tone={isHR ? 'hr' : 'employee'} />
          <div style={{ flexGrow: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-400)' }}>
              {user?.employeeCode || (isHR ? 'HR Admin' : 'Employee')}
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Sign out"
            title="Sign out"
            style={{ background: 'none', border: 'none', color: 'var(--color-slate-400)', cursor: 'pointer', padding: '0.375rem', display: 'flex', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main layout area */}
      <div className="app-main" style={{ flexGrow: 1, marginLeft: '248px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar — a slim utility bar. The page's own <PageHeader> owns the
            actual title now, so this never duplicates it. */}
        <header
          style={{
            height: '56px',
            backgroundColor: 'var(--bg-topbar)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-lg)',
            position: 'sticky',
            top: 0,
            zIndex: 'var(--z-sticky)' as unknown as number,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', minWidth: 0 }}>
            <button
              className="app-hamburger"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open menu"
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary-color)', cursor: 'pointer', padding: '0.25rem', flexShrink: 0 }}
            >
              <Menu size={20} />
            </button>
            <span style={{ font: 'var(--font-caption)', color: 'var(--text-tertiary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentSectionLabel(location.pathname)}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginLeft: 'auto' }}>
            <button
              onClick={() => setIsPaletteOpen(true)}
              aria-label="Open command palette"
              title="Search pages and actions (Ctrl+K)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'var(--bg-sunken)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '0.3125rem 0.625rem',
                color: 'var(--text-tertiary-color)',
                cursor: 'pointer',
                font: 'var(--font-body-sm)',
              }}
            >
              <Search size={14} />
              <kbd className="app-command-kbd" style={{ font: 'var(--font-caption)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-sm)', padding: '0.0625rem 0.3125rem' }}>Ctrl K</kbd>
            </button>
            <Badge variant={isHR ? 'hr' : 'employee'} dot={false}>{isHR ? 'HR Admin' : 'Employee'}</Badge>
            <Avatar name={displayName} size="sm" tone={isHR ? 'hr' : 'employee'} />
          </div>
        </header>

        {/* Viewport content */}
        <main style={{ flexGrow: 1, padding: 'var(--space-xl)', minWidth: 0 }}>
          <Outlet />
        </main>
      </div>

      <CommandPalette isOpen={isPaletteOpen} onClose={() => setIsPaletteOpen(false)} actions={paletteActions} />
    </div>
  );
};
