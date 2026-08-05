
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: 'default' | 'lime' | 'info' | 'warning';
}

const TONES = {
  default: 'text-ink',
  lime: 'text-lime',
  info: 'text-info',
  warning: 'text-warning',
} as const;

/** Tuile de statistique du tableau de bord. */
export function StatCard({ label, value, icon: Icon, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="surface-panel rounded-2xl p-5">
      <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted">
        <Icon className={cn('h-4 w-4', TONES[tone])} />
        {label}
      </div>
      <p className={cn('mt-2 font-mono text-2xl font-bold tabular-nums', TONES[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-faint">{hint}</p>}
    </div>
  );
}
