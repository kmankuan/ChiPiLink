/**
 * ModuleStatusBadge — Shows module lifecycle status
 * Statuses: production, live_beta, coming_soon, maintenance
 * live_beta = "We're using this, but still building it"
 */
import { Badge } from '@/components/ui/badge';
import { Construction, Rocket, Clock, Wrench } from 'lucide-react';

const STATUS_CONFIG = {
  production: null, // No badge shown
  live_beta: {
    icon: Construction,
    label: 'Live Beta',
    className: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    description: 'Active but still being improved',
  },
  coming_soon: {
    icon: Clock,
    label: 'Coming Soon',
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Under development',
  },
  maintenance: {
    icon: Wrench,
    label: 'Maintenance',
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400',
    description: 'Temporarily unavailable',
  },
};

export default function ModuleStatusBadge({ status, customLabel, size = 'sm' }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null; // production = no badge

  const Icon = config.icon;
  const label = customLabel || config.label;

  if (size === 'xs') {
    return (
      <Badge variant="outline" className={`${config.className} text-[9px] px-1.5 py-0 gap-0.5`}>
        <Icon className="h-2.5 w-2.5" />
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`${config.className} text-[10px] gap-1`}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export { STATUS_CONFIG };
