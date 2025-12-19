import { h } from 'preact';

export type PermissionLevel = 'allowed' | 'denied' | 'ask';

export interface PermissionBadgeProps {
  level: PermissionLevel;
}

const permissionConfig: Record<PermissionLevel, { color: string; bgColor: string; label: string }> = {
  allowed: {
    color: 'var(--success)',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    label: 'Allowed',
  },
  denied: {
    color: 'var(--error)',
    bgColor: 'rgba(239, 68, 68, 0.1)',
    label: 'Denied',
  },
  ask: {
    color: 'var(--warning)',
    bgColor: 'rgba(251, 191, 36, 0.1)',
    label: 'Ask',
  },
};

export function PermissionBadge(props: PermissionBadgeProps) {
  const { level } = props;
  const config = permissionConfig[level];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 500,
        color: config.color,
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}`,
      }}
    >
      {config.label}
    </span>
  );
}
