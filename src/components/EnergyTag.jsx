const ENERGY_MAP = {
  high: { bg: '#ef444420', color: '#ef4444', label: '⚡ 高精力' },
  low: { bg: '#60a5fa20', color: '#60a5fa', label: '☕ 低精力' },
  physical: { bg: '#fbbf2420', color: '#fbbf24', label: '🏃 体力' },
}

export default function EnergyTag({ energy, size = 'sm' }) {
  const cfg = ENERGY_MAP[energy] || ENERGY_MAP.low
  return (
    <span
      style={{
        fontSize: size === 'sm' ? 10 : 12,
        fontWeight: 600,
        padding: size === 'sm' ? '2px 8px' : '4px 10px',
        borderRadius: 6,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  )
}
