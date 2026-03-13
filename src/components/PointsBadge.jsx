import { usePoints } from '../stores/usePoints'

export default function PointsBadge({ onClick }) {
  const transactions = usePoints((s) => s.transactions)

  const todayEarned = transactions
    .filter((t) => t.type === 'earn')
    .reduce((s, t) => s + t.amount, 0)
  const todaySpent = transactions
    .filter((t) => t.type === 'spend')
    .reduce((s, t) => s + t.amount, 0)
  const todayNet = todayEarned - todaySpent
  const allTimeBalance = usePoints.getState().getAllTimeBalance()

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        borderRadius: 'var(--radius)',
        background: 'var(--bg-card)',
        border: '1px solid var(--accent-yellow)25',
        width: '100%',
        marginBottom: 16,
      }}
    >
      {/* 总余额 */}
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>总余额</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-yellow)' }}>
          {allTimeBalance.toLocaleString()}
        </div>
      </div>

      {/* 分隔线 */}
      <div style={{ width: 1, height: 30, background: 'var(--border)' }} />

      {/* 今日净值 */}
      <div style={{ textAlign: 'left', flex: 1 }}>
        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>今日</div>
        <div style={{
          fontSize: 14, fontWeight: 700,
          color: todayNet >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)',
        }}>
          {todayNet >= 0 ? '+' : ''}{todayNet}
        </div>
      </div>

      {/* 收支明细 */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 10, color: 'var(--accent-green)' }}>+{todayEarned}</div>
        <div style={{ fontSize: 10, color: 'var(--accent-pink)' }}>-{todaySpent}</div>
      </div>
    </button>
  )
}
