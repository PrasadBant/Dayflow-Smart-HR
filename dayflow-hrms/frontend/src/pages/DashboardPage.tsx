import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/primitives/Card';
import { Badge } from '../components/primitives/Badge';
import { Button } from '../components/primitives/Button';
import { CalendarDays, Clock, User, Users, BadgeDollarSign, FolderOpen, ArrowRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user, employee } = useAuth();
  const navigate = useNavigate();

  const isHR = user?.role === 'HR';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Welcome Banner */}
      <Card style={{ background: 'linear-gradient(135deg, var(--color-primary-900) 0%, var(--color-primary-700) 100%)', color: '#ffffff', padding: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary-200)', marginBottom: 'var(--space-xs)' }}>
              {isHR ? 'HR Administration Control Panel' : 'Employee Workspace'}
            </div>
            <h2 style={{ fontSize: 'var(--text-2xl)', color: '#ffffff', marginBottom: 'var(--space-xs)' }}>
              Welcome back, {employee ? `${employee.firstName} ${employee.lastName}` : user?.email}!
            </h2>
            <p style={{ color: 'var(--color-primary-100)', fontSize: 'var(--text-sm)', maxWidth: '600px' }}>
              {isHR
                ? 'Manage employee records, approve leave applications, monitor attendance, and review organization payroll.'
                : 'View your profile, check in for work, submit leave applications, and view your payslips.'}
            </p>
          </div>
          <Badge variant={isHR ? 'hr' : 'employee'} style={{ fontSize: 'var(--text-sm)', padding: '0.5rem 1rem' }}>
            {user?.role} Role
          </Badge>
        </div>
      </Card>

      {/* Overview Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-lg)' }}>
        {/* Leave Card */}
        <Card>
          <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle>Leave Requests</CardTitle>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-warning-50)' }}>
              <CalendarDays size={22} color="var(--color-warning-500)" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription style={{ marginBottom: 'var(--space-md)' }}>
              {isHR ? 'Review pending leave approval queue' : 'Submit and track your leave requests'}
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/leave')}
              rightIcon={<ArrowRight size={16} />}
              style={{ width: '100%' }}
            >
              {isHR ? 'Open Approvals Queue' : 'Apply for Leave'}
            </Button>
          </CardContent>
        </Card>

        {/* Attendance Card */}
        <Card>
          <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle>Attendance</CardTitle>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-success-50)' }}>
              <Clock size={22} color="var(--color-success-500)" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription style={{ marginBottom: 'var(--space-md)' }}>
              Record check-in/out & view daily records
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/attendance')}
              rightIcon={<ArrowRight size={16} />}
              style={{ width: '100%' }}
            >
              Go to Attendance
            </Button>
          </CardContent>
        </Card>

        {/* Profile Card */}
        <Card>
          <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CardTitle>Employee Profile</CardTitle>
            <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-primary-50)' }}>
              <User size={22} color="var(--color-primary-500)" />
            </div>
          </CardHeader>
          <CardContent>
            <CardDescription style={{ marginBottom: 'var(--space-md)' }}>
              View and update contact details & preferences
            </CardDescription>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
              rightIcon={<ArrowRight size={16} />}
              style={{ width: '100%' }}
            >
              View My Profile
            </Button>
          </CardContent>
        </Card>

        {/* HR Special Employees Card */}
        {isHR && (
          <Card style={{ borderColor: 'var(--color-purple-500)', backgroundColor: 'var(--color-purple-50)' }}>
            <CardHeader style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <CardTitle style={{ color: 'var(--color-purple-700)' }}>Employee Directory</CardTitle>
              <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-purple-100)' }}>
                <Users size={22} color="var(--color-purple-700)" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription style={{ marginBottom: 'var(--space-md)', color: 'var(--color-purple-700)' }}>
                HR Administrative access to all employee records & context switching
              </CardDescription>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/employees')}
                rightIcon={<ArrowRight size={16} />}
                style={{ width: '100%', backgroundColor: 'var(--color-purple-700)' }}
              >
                Open Employee Directory
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
