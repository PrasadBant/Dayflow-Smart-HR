import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '@shared/types';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Card } from '../primitives/Card';
import { Button } from '../primitives/Button';

export interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-page)' }}>
        <Loader2 className="animate-spin" size={24} color="var(--color-primary-600)" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export interface RequireRoleProps {
  allowedRole: Role;
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowedRole, children }) => {
  const { user, hasRole } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasRole(allowedRole)) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl)', minHeight: '60vh' }}>
        <Card style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: 'var(--space-xl)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-danger-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
            <ShieldAlert size={24} color="var(--color-danger-500)" />
          </div>
          <h1 style={{ font: 'var(--font-section-title)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-sm)' }}>Access denied</h1>
          <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginBottom: 'var(--space-lg)' }}>
            This section is restricted to <strong>{allowedRole}</strong> administrators. Your account role is <strong>{user.role}</strong>.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>Go back</Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
