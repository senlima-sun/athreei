export type StatusType = 'online' | 'offline' | 'warning' | 'error';

export interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusColors: Record<StatusType, string> = {
  online: 'var(--success)',
  offline: 'var(--text-muted)',
  warning: 'var(--warning)',
  error: 'var(--error)',
};

const sizeMap = {
  sm: 6,
  md: 8,
  lg: 10,
};

export function StatusIndicator(props: StatusIndicatorProps) {
  const { status, label, size = 'md' } = props;

  const dotSize = sizeMap[size];
  const color = statusColors[status];
  const shouldPulse = status === 'online';

  const pulseKeyframes = `
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }
  `;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      {shouldPulse && <style>{pulseKeyframes}</style>}
      <span
        style={{
          display: 'inline-block',
          width: `${dotSize}px`,
          height: `${dotSize}px`,
          borderRadius: '50%',
          backgroundColor: color,
          animation: shouldPulse ? 'pulse 2s ease-in-out infinite' : 'none',
        }}
      />
      {label && (
        <span style={{
          color: 'var(--text-secondary)',
          fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
        }}>
          {label}
        </span>
      )}
    </div>
  );
}
