export interface Tab {
  id: string;
  label: string;
}

export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

export function Tabs(props: TabsProps) {
  const { tabs, activeTab, onChange } = props;

  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        gap: '4px',
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '14px',
              fontWeight: isActive ? 600 : 500,
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 0.15s ease',
              borderBottom: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        );
      })}
      <style>{`
        button:hover {
          color: var(--accent);
        }
      `}</style>
    </div>
  );
}
