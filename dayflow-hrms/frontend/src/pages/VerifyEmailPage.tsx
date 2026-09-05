import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { VerifyEmailRequest } from '@shared/types';
import { verifyEmail as verifyEmailRequest } from '../api-client/auth';
import { parseApiError } from '../utils/apiHelper';

export const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = (location.state as { email?: string })?.email || '';
  const tokenFromLink = searchParams.get('token') || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState(tokenFromLink);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const autoSubmitAttempted = useRef(false);

  const verify = async (token: string) => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const payload: VerifyEmailRequest = { token };
      await verifyEmailRequest(payload);
      setIsSuccess(true);
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: unknown) {
      setErrorMessage(parseApiError(err).message || 'Invalid or expired verification token.');
    } finally {
      setIsLoading(false);
    }
  };

  // A real "Verify your email" link (see backend Mailer) opens this page as
  // /verify-email?token=... — auto-verify immediately instead of making the
  // user notice, copy, and re-paste a token already sitting in the address
  // bar they just clicked from. The manual field stays for the dev-mode
  // path (token printed to the server console, not in any link).
  useEffect(() => {
    if (tokenFromLink && !autoSubmitAttempted.current) {
      autoSubmitAttempted.current = true;
      verify(tokenFromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFromLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      setErrorMessage('Please paste your verification token.');
      return;
    }
    await verify(code);
  };

  return (
    <AuthLayout>
      <div style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 style={{ font: 'var(--font-page-title)', color: 'var(--text-primary-color)' }}>Verify your email</h1>
        <p style={{ font: 'var(--font-body)', color: 'var(--text-secondary-color)', marginTop: '0.25rem' }}>
          {initialEmail ? `We sent a verification link to ${initialEmail}.` : 'Paste the verification token sent to your email.'}
        </p>
      </div>

      {isSuccess ? (
        <ErrorBanner variant="success" title="Email verified" message="Your account is now active. Redirecting to sign in…" />
      ) : tokenFromLink && isLoading && !errorMessage ? (
        <div style={{ textAlign: 'center', color: 'var(--text-secondary-color)', padding: 'var(--space-lg) 0' }}>Verifying your email…</div>
      ) : (
        <>
          {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}
          <form onSubmit={handleSubmit}>
            {!initialEmail && (
              <FormField label="Work email" required htmlFor="verify-email">
                <Input id="verify-email" type="email" placeholder="employee@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </FormField>
            )}
            <FormField label="Verification token" required helperText="Paste the token from your email, or from the server console in development" htmlFor="verify-code">
              <div style={{ position: 'relative' }}>
                <KeyRound size={17} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
                <Input id="verify-code" type="text" placeholder="Paste your verification token" value={code} onChange={(e) => setCode(e.target.value)} style={{ paddingLeft: '38px' }} required />
              </div>
            </FormField>
            <Button type="submit" variant="primary" size="lg" isLoading={isLoading} style={{ width: '100%', marginTop: 'var(--space-sm)' }} rightIcon={<ArrowRight size={18} />}>
              Verify account
            </Button>
          </form>
        </>
      )}

      <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
        Already verified? <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
      </div>
    </AuthLayout>
  );
};
