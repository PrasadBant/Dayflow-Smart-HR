import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import { MailCheck, KeyRound, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
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
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err: unknown) {
      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Invalid or expired verification code. Please check your inbox and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // A real "Verify your email" link (see backend Mailer) opens this page as
  // /verify-email?token=... — auto-verify immediately instead of making the
  // user notice, copy, and re-paste a token that's already sitting in the
  // address bar they just clicked from. The manual field below stays for the
  // dev-mode path (token printed to the server console, not in any link).
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)', padding: 'var(--space-md)' }}>
      <Card style={{ maxWidth: '460px', width: '100%', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-lg)' }}>
        <CardHeader style={{ textAlign: 'center', marginBottom: 'var(--space-lg)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-success-500)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
            <MailCheck size={28} color="#ffffff" />
          </div>
          <CardTitle style={{ fontSize: 'var(--text-2xl)' }}>Verify Your Email</CardTitle>
          <CardDescription>
            {initialEmail
              ? `We sent a verification token to ${initialEmail}`
              : 'Paste the verification token sent to your registered email address'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <ErrorBanner
              variant="success"
              title="Email Verified Successfully!"
              message="Your account is now active. Redirecting you to the login screen..."
            />
          ) : tokenFromLink && isLoading && !errorMessage ? (
            <div style={{ textAlign: 'center', color: 'var(--color-slate-600)', padding: 'var(--space-lg) 0' }}>
              Verifying your email…
            </div>
          ) : (
            <>
              {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}

              <form onSubmit={handleSubmit}>
                {!initialEmail && (
                  <FormField label="Work Email" required htmlFor="verify-email">
                    <Input
                      id="verify-email"
                      type="email"
                      placeholder="employee@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </FormField>
                )}

                <FormField label="Verification Token" required helperText="Paste the verification token sent to your inbox (or, in development, printed to the server console on signup)" htmlFor="verify-code">
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                    <Input
                      id="verify-code"
                      type="text"
                      placeholder="Paste your verification token"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      style={{ paddingLeft: '40px' }}
                      required
                    />
                  </div>
                </FormField>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  isLoading={isLoading}
                  style={{ width: '100%', marginTop: 'var(--space-md)' }}
                  rightIcon={<ArrowRight size={18} />}
                >
                  Verify Account & Continue
                </Button>
              </form>
            </>
          )}

          <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-slate-600)' }}>
            Verified already?{' '}
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
              Proceed to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
