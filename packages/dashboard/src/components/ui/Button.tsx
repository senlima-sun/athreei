import { h, ComponentChildren } from 'preact';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: h.JSX.TargetedMouseEvent<HTMLButtonElement>) => void;
  children: ComponentChildren;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<ButtonVariant, h.JSX.CSSProperties> = {
  primary: {
    background: 'var(--accent)',
    color: '#ffffff',
    border: '1px solid var(--accent)',
  },
  secondary: {
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },
  danger: {
    background: 'var(--error)',
    color: '#ffffff',
    border: '1px solid var(--error)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid transparent',
  },
};

const sizeStyles: Record<ButtonSize, h.JSX.CSSProperties> = {
  sm: {
    padding: '4px 12px',
    fontSize: '12px',
  },
  md: {
    padding: '8px 16px',
    fontSize: '14px',
  },
  lg: {
    padding: '12px 24px',
    fontSize: '16px',
  },
};

export function Button(props: ButtonProps) {
  const {
    variant = 'secondary',
    size = 'md',
    disabled = false,
    loading = false,
    onClick,
    children,
    type = 'button',
  } = props;

  const isDisabled = disabled || loading;

  const baseStyle: h.JSX.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderRadius: '6px',
    fontWeight: 500,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    opacity: isDisabled ? 0.6 : 1,
    transition: 'all 0.15s ease',
    ...variantStyles[variant],
    ...sizeStyles[size],
  };

  const handleClick = (e: h.JSX.TargetedMouseEvent<HTMLButtonElement>) => {
    if (!isDisabled && onClick) {
      onClick(e);
    }
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      style={baseStyle}
    >
      {loading && (
        <span
          style={{
            display: 'inline-block',
            width: '14px',
            height: '14px',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 0.6s linear infinite',
          }}
        />
      )}
      {children}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        button:active:not(:disabled) {
          transform: translateY(0);
        }
      `}</style>
    </button>
  );
}
