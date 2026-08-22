import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../../../../shared/types';
import { ShieldAlert } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../primitives/Card';
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
        <div style={{ color: 'var(--color-primary-600)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>Loading Dayflow HRMS...</div>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2xl)' }}>
        <Card style={{ maxWidth: '500rem', width: '100%', textAlign: 'center', padding: 'var(--space-xl)' }}>
          <CardHeader>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-danger-50)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
              <ShieldAlert size={28} color="var(--color-danger-500)" />
            </div>
            <CardTitle>Access Denied (403 Forbidden)</CardTitle>
          </CardHeader>
          <CardContent style={{ gap: 'var(--space-md)', display: 'flex', flexDirection: 'column' }}>
            <p style={{ color: 'var(--color-slate-600)', fontSize: 'var(--text-sm)' }}>
              This section is restricted to <strong>{allowedRole}</strong> administrators only. Your current account role is <strong>{user.role}</strong>.
            </p>
            <div>
              <Button variant="outline" onClick={() => window.history.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
