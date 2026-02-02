// Componente: Status Badge

import { cn } from '@/lib/utils';
import type { StatusLicenca } from '@/types/licenca';

interface StatusBadgeProps {
  status: StatusLicenca;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<StatusLicenca, { label: string; className: string }> = {
  VENCIDO: {
    label: 'Vencido',
    className: 'status-vencido',
  },
  URGENTE: {
    label: 'Urgente',
    className: 'status-urgente',
  },
  PROXIMO: {
    label: 'Próximo',
    className: 'status-proximo',
  },
  EM_BREVE: {
    label: 'Em Breve',
    className: 'status-em-breve',
  },
  NORMAL: {
    label: 'Normal',
    className: 'status-finalizado',
  },
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
};

export function StatusBadge({ 
  status, 
  showLabel = true, 
  size = 'md' 
}: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={cn(
        'status-badge',
        config.className,
        sizeClasses[size]
      )}
    >
      {showLabel ? config.label : ''}
    </span>
  );
}

export default StatusBadge;
