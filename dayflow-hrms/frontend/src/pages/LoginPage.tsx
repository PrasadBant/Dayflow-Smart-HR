import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AuthLayout } from '../components/layout/AuthLayout';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { LoginRequest } from '@shared/types';
import { login as loginRequest } from '../api-client/auth';
import { getProfile } from '../api-client/employees';
import { parseApiError } from '../utils/apiHelper';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUnverified(false);

    if (!email || !password) {
      setErrorMessage('Please enter both work email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const payload: LoginRequest = { email, password };
      const res = await loginRequest(payload);

      // Fetch the employee profile right away so AuthContext.employee (used
      // by the sidebar/dashboard greeting) is populated from the first
      // render instead of staying null until a page refresh restores it.
      let employee = null;
      try {
        employee = await getProfile();
      } catch {
        // Non-fatal — the session is still valid without it.
      }

      login(res.token, res.user, employee);
      navigate('/dashboard');
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      if (parsed.code === 'EMAIL_NOT_VERIFIED') {
        setIsUnverified(true);
        setErrorMessage('Your email address is not verified yet.');
      } else if (parsed.code === 'UNAUTHORIZED') {
        setErrorMessage('Invalid email address or password.');
      } else {
        setErrorMessage(parsed.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ font: 'var(--font-page-title)', color: 'var(--text-primary-color)' }}>Sign in</h1>
        <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>
          Use your work email and password.
        </p>
      </div>

      {errorMessage && <ErrorBanner variant={isUnverified ? 'warning' : 'error'} message={errorMessage} />}

      {isUnverified && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/verify-email', { state: { email } })}
            rightIcon={<ArrowRight size={16} />}
            style={{ width: '100%' }}
          >
            Go to verification
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormField label="Work email" required htmlFor="login-email">
          <div style={{ position: 'relative' }}>
            <Mail size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
            <Input id="login-email" type="email" placeholder="employee@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '38px' }} required />
          </div>
        </FormField>

        <FormField label="Password" required htmlFor="login-password">
          <div style={{ position: 'relative' }}>
            <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
            <Input id="login-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '38px' }} required />
          </div>
        </FormField>

        <div style={{ textAlign: 'right', marginBottom: 'var(--space-md)' }}>
          <Link to="/forgot-password" style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Forgot password?</Link>
        </div>

        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: '100%' }} leftIcon={<LogIn size={18} />}>
          Sign in
        </Button>
      </form>

      <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
        Don't have an account? <Link to="/signup" style={{ fontWeight: 600 }}>Create an account</Link>
      </div>
    </AuthLayout>
  );
};
