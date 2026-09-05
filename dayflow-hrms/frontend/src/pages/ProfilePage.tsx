import React, { useState, useEffect, useCallback } from 'react';
import { User, Mail, Phone, MapPin, Building2, Briefcase, Save } from 'lucide-react';
import { PageHeader } from '../components/primitives/PageHeader';
import { Card } from '../components/primitives/Card';
import { FormField, Input } from '../components/primitives/FormField';
import { Button } from '../components/primitives/Button';
import { Skeleton } from '../components/primitives/Skeleton';
import { ErrorBanner } from '../components/primitives/ErrorBanner';
import { Avatar } from '../components/primitives/Avatar';
import { useToast } from '../components/primitives/Toast';
import type { Employee, UpdateProfileRequest } from '@shared/types';
import { getProfile, updateMyProfile } from '../api-client/employees';
import { parseApiError } from '../utils/apiHelper';

export const ProfilePage: React.FC = () => {
  const { showToast } = useToast();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [profilePictureUrl, setProfilePictureUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const emp = await getProfile();
      setEmployee(emp);
      setPhone(emp.phone || '');
      setAddress(emp.address || '');
      setProfilePictureUrl(emp.profilePictureUrl || '');
    } catch (err) {
      setLoadError(parseApiError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);
    try {
      const payload: UpdateProfileRequest = {
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        profilePictureUrl: profilePictureUrl.trim() || undefined,
      };
      const updated = await updateMyProfile(payload);
      setEmployee(updated);
      showToast('Profile updated.', 'success');
    } catch (err) {
      setSaveError(parseApiError(err).message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      <PageHeader title="My profile" description="Your identity, employment details, and contact information." icon={<User size={20} color="var(--color-primary-600)" />} />

      {loadError && <ErrorBanner variant="error" message={loadError} onRetry={load} />}

      {isLoading ? (
        <Card><Skeleton height="120px" /></Card>
      ) : employee ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-xl)', alignItems: 'start' }}>
          {/* Identity — read only */}
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              <Avatar name={`${employee.firstName} ${employee.lastName}`} size="lg" />
              <div>
                <div style={{ font: 'var(--font-section-title)', fontSize: 'var(--text-lg)' }}>{employee.firstName} {employee.lastName}</div>
                <div style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)' }}>{employee.employeeCode}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
                <Mail size={15} color="var(--text-tertiary-color)" /> {employee.email}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
                <Building2 size={15} color="var(--text-tertiary-color)" /> {employee.departmentName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', font: 'var(--font-body)', color: 'var(--text-secondary-color)' }}>
                <Briefcase size={15} color="var(--text-tertiary-color)" /> {employee.position}
              </div>
              <div className="font-numeric" style={{ font: 'var(--font-body-sm)', color: 'var(--text-tertiary-color)', paddingTop: '0.25rem', borderTop: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
                Hired {employee.hireDate}
              </div>
            </div>
          </Card>

          {/* Editable contact details */}
          <Card>
            <h2 style={{ font: 'var(--font-section-title)', marginBottom: 'var(--space-md)' }}>Contact details</h2>
            {saveError && <ErrorBanner variant="error" message={saveError} />}

            <form onSubmit={handleSave}>
              <FormField label="Phone" htmlFor="profile-phone">
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
                  <Input id="profile-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" style={{ paddingLeft: '34px' }} />
                </div>
              </FormField>

              <FormField label="Address" htmlFor="profile-address">
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-disabled-color)' }} />
                  <Input id="profile-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Main St, City" style={{ paddingLeft: '34px' }} />
                </div>
              </FormField>

              <FormField label="Profile picture URL" htmlFor="profile-picture" helperText="Only phone, address, and profile picture can be self-edited — everything else is managed by HR">
                <Input id="profile-picture" value={profilePictureUrl} onChange={(e) => setProfilePictureUrl(e.target.value)} placeholder="https://…" />
              </FormField>

              <Button type="submit" variant="primary" isLoading={isSaving} leftIcon={<Save size={16} />}>
                Save changes
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
};
