import { useState } from 'react'
import { usePoints } from '../stores/usePoints'
import { useToast } from './Toast'

const QUICK_SPENDS = [
  { label: '🎮 游戏 30min', amount: 30 },
  { label: '📱 刷视频 15min', amount: 15 },
  { label: '🍰 吃甜品', amount: 20 },
  { label: '☕ 咖啡', amount: 10 },
]

export default function SpendSheet({ open, onClose }) {
  const { transactions, spend } = usePoints()
  const showToast = useToast()
  const [customLabel, setCustomLabel] = useState('')
  const [customAmount, setCustomAmount] = useState('')

  if (!open) return null

  const todayEarned = transactions
    .filter((t) => t.type === 'earn')
    .reduce((s, t) => s + t.amount, 0)
  const todaySpent = transactions
    .filter((t) => t.type === 'spend')
    .reduce((s, t) => s + t.amount, 0)

  const handleQuickSpend = (label, amount) => {
    spend(amount, label)
    showToast(`-${amount} 积分`, 'var(--accent-pink)')
  }

  const handleCustomSpend = () => {
    if (!customLabel.trim() || !customAmount) return
    const amt = parseInt(customAmount)
    if (amt <= 0) return
    spend(amt, customLabel.trim())
    showToast(`-${amt} 积分`, 'var(--accent-pink)')
    setCustomLabel('')
    setCustomAmount('')
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        {/* 标题 + 余额 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-yellow)' }}>
            💰 积分消费
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            今日: <span style={{ color: 'var(--accent-green)' }}>+{todayEarned}</span>
            {' / '}
            <span style={{ color: 'var(--accent-pink)' }}>-{todaySpent}</span>
          </div>
        </div>

        {/* 快捷消费 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {QUICK_SPENDS.map((qs) => (
            <button
              key={qs.label}
              onClick={() => handleQuickSpend(qs.label, qs.amount)}
              style={{
                padding: '12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 12, textAlign: 'left',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}
            >
              <span>{qs.label}</span>
              <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>-{qs.amount}</span>
            </button>
          ))}
        </div>

        {/* 自定义消费 */}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
          自定义消费
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="干了什么..."
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            style={{
              flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 12,
            }}
          />
          <input
            type="number"
            placeholder="积分"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            style={{
              width: 70, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-input)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: 12,
            }}
          />
          <button
            onClick={handleCustomSpend}
            style={{
              padding: '8px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-pink)', color: '#fff', fontSize: 12, fontWeight: 600,
            }}
          >
            花
          </button>
        </div>

        {/* 今日明细 */}
        {transactions.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
              今日明细
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {[...transactions].reverse().map((txn) => (
                <div
                  key={txn.id}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderBottom: '1px solid var(--border)',
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div style={{ color: 'var(--text-primary)' }}>{txn.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {new Date(txn.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span style={{
                    fontWeight: 700,
                    color: txn.type === 'earn' ? 'var(--accent-green)' : 'var(--accent-pink)',
                  }}>
                    {txn.type === 'earn' ? '+' : '-'}{txn.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
