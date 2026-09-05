import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, CreditCard } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { SignupRequest } from '@shared/types';
import { signup as signupRequest } from '../api-client/auth';
import { parseApiError } from '../utils/apiHelper';

export const SignupPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password || !firstName || !lastName) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
      setErrorMessage('Password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    setIsLoading(true);
    try {
      // SignupRequest strictly MUST NOT contain a role field — the backend forces EMPLOYEE.
      const payload: SignupRequest = { email, password, firstName, lastName, employeeCode: employeeCode || undefined };
      const res = await signupRequest(payload);

      // Signup returns { user } with no token — never auto-authenticate; go verify.
      navigate('/verify-email', { state: { email: res.user.email } });
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.code === 'EMAIL_TAKEN' ? 'An account with this email already exists.' : parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ font: 'var(--font-page-title)', color: 'var(--text-primary-color)' }}>Create your account</h1>
        <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>
          Register to join your organization on Dayflow.
        </p>
      </div>

      {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <FormField label="First name" required htmlFor="signup-firstname">
            <Input id="signup-firstname" placeholder="Jane" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </FormField>
          <FormField label="Last name" required htmlFor="signup-lastname">
            <Input id="signup-lastname" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </FormField>
        </div>

        <FormField label="Work email" required htmlFor="signup-email">
          <div style={{ position: 'relative' }}>
            <Mail size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
            <Input id="signup-email" type="email" placeholder="jane.doe@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '38px' }} required />
          </div>
        </FormField>

        <FormField label="Employee code (optional)" helperText="Provided by HR, e.g. EMP001" htmlFor="signup-code">
          <div style={{ position: 'relative' }}>
            <CreditCard size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
            <Input id="signup-code" placeholder="EMP001" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} style={{ paddingLeft: '38px' }} />
          </div>
        </FormField>

        <FormField label="Password" required helperText="8+ characters with at least 1 letter and 1 number" htmlFor="signup-password">
          <div style={{ position: 'relative' }}>
            <Lock size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
            <Input id="signup-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingLeft: '38px' }} required />
          </div>
        </FormField>

        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: '100%', marginTop: 'var(--space-sm)' }} leftIcon={<UserPlus size={18} />}>
          Create account
        </Button>
      </form>

      <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
        Already registered? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
      </div>
    </AuthLayout>
  );
};
