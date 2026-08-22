import React from 'react';
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
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../primitives/Badge';
import { Button } from '../primitives/Button';
import '../../design/tokens.css';

export const AppShell: React.FC = () => {
  const { user, employee, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Leave Requests', path: '/leave', icon: <CalendarDays size={18} /> },
    { label: 'Attendance', path: '/attendance', icon: <Clock size={18} /> },
    { label: 'My Profile', path: '/profile', icon: <UserIcon size={18} /> },
    { label: 'Payroll', path: '/payroll', icon: <BadgeDollarSign size={18} /> },
    { label: 'Documents', path: '/documents', icon: <FolderOpen size={18} /> },
  ];

  // HR-only navigation item
  const hrNavItem = { label: 'Employees', path: '/employees', icon: <Users size={18} />, hrOnly: true };

  const getCurrentTitle = () => {
    const currentPath = location.pathname;
    if (currentPath.startsWith('/dashboard')) return 'Dashboard Overview';
    if (currentPath.startsWith('/leave')) return 'Leave Management';
    if (currentPath.startsWith('/attendance')) return 'Attendance & Time Tracking';
    if (currentPath.startsWith('/profile')) return 'Employee Profile';
    if (currentPath.startsWith('/payroll')) return 'Payroll & Compensation';
    if (currentPath.startsWith('/documents')) return 'Document Repository';
    if (currentPath.startsWith('/employees')) return 'Employee Directory (HR)';
    return 'Dayflow HRMS';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
      {/* Fixed Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: 'var(--bg-sidebar)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: 'var(--space-lg)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-primary-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={22} color="#ffffff" />
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Dayflow
            </h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              HRMS Platform
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ flexGrow: 1, padding: 'var(--space-md) var(--space-sm)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#ffffff' : 'var(--color-slate-400)',
                backgroundColor: isActive ? 'var(--color-primary-600)' : 'transparent',
                transition: 'all var(--transition-fast)',
                textDecoration: 'none',
              })}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}

          {/* HR Only Navigation Section */}
          {user?.role === 'HR' && (
            <>
              <div
                style={{
                  marginTop: 'var(--space-md)',
                  marginBottom: 'var(--space-xs)',
                  paddingLeft: '1rem',
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--color-slate-400)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                HR Administration
              </div>
              <NavLink
                to={hrNavItem.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#ffffff' : 'var(--color-purple-100)',
                  backgroundColor: isActive ? 'var(--color-purple-700)' : 'rgba(168, 85, 247, 0.1)',
                  transition: 'all var(--transition-fast)',
                  textDecoration: 'none',
                })}
              >
                {hrNavItem.icon}
                <span>{hrNavItem.label}</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Sidebar Footer User Info */}
        <div
          style={{
            padding: 'var(--space-md)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: user?.role === 'HR' ? 'var(--color-purple-500)' : 'var(--color-primary-600)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              fontSize: 'var(--text-sm)',
            }}
          >
            {employee ? `${employee.firstName[0]}${employee.lastName[0]}` : user?.email[0].toUpperCase()}
          </div>
          <div style={{ flexGrow: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {employee ? `${employee.firstName} ${employee.lastName}` : user?.email}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-slate-400)' }}>
              {user?.employeeCode || 'Employee'}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div style={{ flexGrow: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header
          style={{
            height: '64px',
            backgroundColor: 'var(--bg-topbar)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 var(--space-xl)',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-slate-900)' }}>
            {getCurrentTitle()}
          </h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Badge variant={user?.role === 'HR' ? 'hr' : 'employee'}>
              {user?.role === 'HR' ? 'HR Admin' : 'Employee'}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              leftIcon={<LogOut size={16} />}
              onClick={handleLogout}
            >
              Sign Out
            </Button>
          </div>
        </header>

        {/* Viewport Content */}
        <main style={{ flexGrow: 1, padding: 'var(--space-xl)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
