import { h, ComponentChildren } from 'preact';

export interface CardProps {
  title?: string;
  children: ComponentChildren;
  className?: string;
  actions?: ComponentChildren;
  style?: h.JSX.CSSProperties;
}

export function Card(props: CardProps) {
  const { title, children, className, actions, style } = props;

  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
        ...style,
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
          }}
        >
          {title && (
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
              }}
            >
              {title}
            </h3>
          )}
          {actions && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {actions}
            </div>
          )}
        </div>
      )}
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}
