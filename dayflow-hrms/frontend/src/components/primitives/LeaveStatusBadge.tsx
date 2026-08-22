import React from 'react';
import { Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Badge } from './Badge';
import type { LeaveStatus } from '../../../../../shared/types';

export interface LeaveStatusBadgeProps {
  status: LeaveStatus;
  size?: 'sm' | 'md';
}

export const LeaveStatusBadge: React.FC<LeaveStatusBadgeProps> = ({ status, size = 'md' }) => {
  const getProps = () => {
    switch (status) {
      case 'Approved':
        return {
          variant: 'approved' as const,
          icon: <CheckCircle2 size={size === 'sm' ? 12 : 14} />,
        };
      case 'Rejected':
        return {
          variant: 'rejected' as const,
          icon: <XCircle size={size === 'sm' ? 12 : 14} />,
        };
      case 'Pending':
      default:
        return {
          variant: 'pending' as const,
          icon: <Clock size={size === 'sm' ? 12 : 14} />,
        };
    }
  };

  const { variant, icon } = getProps();

  return (
    <Badge variant={variant} size={size}>
      {icon}
      <span>{status}</span>
    </Badge>
  );
};
