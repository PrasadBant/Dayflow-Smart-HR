import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { MailCheck, KeyRound, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import type { VerifyEmailRequest } from '@shared/types';
import { parseApiError, type AuthApiClient } from '../utils/apiHelper';

export const VerifyEmailPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const initialEmail = (location.state as { email?: string })?.email || '';

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!code) {
      setErrorMessage('Please enter your 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: VerifyEmailRequest = { token: code };

      const authModulePath = '../api-client/auth';
      const apiClient = (await import(/* @vite-ignore */ authModulePath).catch(() => null)) as AuthApiClient | null;

      if (apiClient && apiClient.verifyEmail) {
        await apiClient.verifyEmail(payload);
      }

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
              ? `We sent a verification code to ${initialEmail}`
              : 'Enter the verification code sent to your registered email address'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <ErrorBanner
              variant="success"
              title="Email Verified Successfully!"
              message="Your account is now active. Redirecting you to the login screen..."
            />
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

                <FormField label="Verification Code" required helperText="Enter the 6-digit code sent to your inbox" htmlFor="verify-code">
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                    <Input
                      id="verify-code"
                      type="text"
                      placeholder="123456"
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
