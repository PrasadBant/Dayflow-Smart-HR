import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
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
      // delivery is actually configured — shown verbatim, not paraphrased
      // into a generic "check your inbox" that could misrepresent it.
      setResultMessage(res.message);
    } catch (err: unknown) {
      setErrorMessage(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-page)', padding: 'var(--space-md)' }}>
      <Card style={{ maxWidth: '440px', width: '100%', padding: 'var(--space-xl)', boxShadow: 'var(--shadow-lg)' }}>
        <CardHeader style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--color-primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-md)' }}>
            <KeyRound size={28} color="#ffffff" />
          </div>
          <CardTitle style={{ fontSize: 'var(--text-2xl)' }}>Reset Your Password</CardTitle>
          <CardDescription>Enter your work email and we'll send you a reset link</CardDescription>
        </CardHeader>

        <CardContent>
          {resultMessage ? (
            <ErrorBanner variant="success" title="Check your email" message={resultMessage} />
          ) : (
            <>
              {errorMessage && <ErrorBanner variant="error" message={errorMessage} />}

              <form onSubmit={handleSubmit}>
                <FormField label="Work Email" required htmlFor="forgot-email">
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }} />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="employee@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                  Send Reset Link
                </Button>
              </form>
            </>
          )}

          <div style={{ marginTop: 'var(--space-xl)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-slate-600)' }}>
            <Link to="/login" style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
              Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
