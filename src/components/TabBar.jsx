const TABS = [
  { id: 'dashboard', icon: '◈', label: '项目' },
  { id: 'pipeline', icon: '▶', label: '今日' },
  { id: 'review', icon: '📊', label: '复盘' },
  { id: 'achievements', icon: '🏆', label: '成就' },
]

export default function TabBar({ activeTab, onTabChange }) {
  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-around',
        paddingBottom: 'var(--safe-bottom)',
        zIndex: 100,
      }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
            padding: '10px 0 8px',
            background: 'transparent',
            color: activeTab === tab.id ? 'var(--accent-green)' : 'var(--text-muted)',
            fontSize: 18,
            transition: 'color 0.15s',
          }}
        >
          <span>{tab.icon}</span>
          <span style={{ fontSize: 10, fontWeight: 600 }}>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
