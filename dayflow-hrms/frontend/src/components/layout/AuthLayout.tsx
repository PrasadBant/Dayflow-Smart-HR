import React from 'react';
import { Building2, Clock, CalendarCheck, BadgeDollarSign } from 'lucide-react';
import '../../design/tokens.css';

export interface AuthLayoutProps {
  children: React.ReactNode;
}

const CAPABILITIES = [
  { icon: <Clock size={18} />, label: 'Track attendance in one click' },
  { icon: <CalendarCheck size={18} />, label: 'Request and approve leave' },
  { icon: <BadgeDollarSign size={18} />, label: 'View payslips and payroll' },
];

/**
 * The five auth screens (Login, Signup, Verify, Forgot/Reset Password) each
 * used to independently center a Card on a plain page background — visually
 * fine but generic, and easy for the five to drift apart in spacing. One
 * layout now owns the shared brand panel + centered-form shape; each page
 * only supplies its own form content.
 *
 * The left panel is real, restrained content — this product's own actual
 * capabilities, not fabricated testimonials/logos/stats.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-page)' }}>
      <div
        style={{
          flex: '0 0 42%',
          maxWidth: '520px',
          background: `linear-gradient(160deg, var(--color-slate-900) 0%, var(--color-primary-900) 100%)`,
          color: 'var(--text-on-dark)',
          padding: 'var(--space-2xl)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
        className="df-auth-panel"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-500)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} color="#ffffff" />
          </div>
          <span style={{ font: 'var(--font-section-title)', fontSize: 'var(--text-lg)', color: '#ffffff' }}>Dayflow</span>
        </div>

        <div>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: 'var(--space-md)' }}>
            One place for your team's workforce operations.
          </h1>
          <p style={{ font: 'var(--font-body)', color: 'var(--text-on-dark-muted)', marginBottom: 'var(--space-xl)', maxWidth: '380px' }}>
            Attendance, leave, payroll, and employee records — for everyone on the team, in one place.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {CAPABILITIES.map((c) => (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', color: 'var(--text-on-dark)' }}>
                <span style={{ color: 'var(--color-primary-300)' }}>{c.icon}</span>
                <span style={{ font: 'var(--font-body)' }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ font: 'var(--font-caption)', color: 'var(--text-on-dark-muted)' }}>
          © {new Date().getFullYear()} Dayflow HRMS
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-lg)', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>{children}</div>
      </div>
    </div>
  );
};
