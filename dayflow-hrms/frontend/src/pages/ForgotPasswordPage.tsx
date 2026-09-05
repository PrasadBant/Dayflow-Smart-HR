import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { ForgotPasswordRequest } from '@shared/types';
import { forgotPassword } from '../api-client/auth';
import { parseApiError } from '../utils/apiHelper';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setResultMessage(null);
    setIsLoading(true);
    try {
      const payload: ForgotPasswordRequest = { email };
      const res = await forgotPassword(payload);
      // The backend's message is already accurate about whether email
      // delivery is actually configured — shown verbatim, never paraphrased
      // into a generic "check your inbox" that could misrepresent it.
      setResultMessage(res.message);
    } catch (err: unknown) {
      setErrorMessage(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ font: 'var(--font-page-title)', color: 'var(--text-primary-color)' }}>Reset your password</h1>
        <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>
          Enter your work email and we'll send you a reset link.
        </p>
      </div>

      {resultMessage ? (
        <ErrorBanner variant="success" title="Check your email" message={resultMessage} />
      ) : (
        <>
          {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}
          <form onSubmit={handleSubmit}>
            <FormField label="Work email" required htmlFor="forgot-email">
              <div style={{ position: 'relative' }}>
                <Mail size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
                <Input id="forgot-email" type="email" placeholder="employee@company.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: '38px' }} required />
              </div>
            </FormField>
            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: '100%', marginTop: 'var(--space-sm)' }} rightIcon={<ArrowRight size={18} />}>
              Send reset link
            </Button>
          </form>
        </>
      )}

      <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
        <Link to="/login" style={{ fontWeight: 600 }}>Back to sign in</Link>
      </div>
    </AuthLayout>
  );
};
