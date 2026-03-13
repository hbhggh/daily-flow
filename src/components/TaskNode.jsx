import { useState } from 'react'
import EnergyTag from './EnergyTag'

const ENERGY_COLORS = {
  high: '#ef4444',
  low: '#60a5fa',
  physical: '#fbbf24',
}

export default function TaskNode({ task, onUpdate, onDelete, onStartTimer }) {
  const [expanded, setExpanded] = useState(false)
  const borderColor = ENERGY_COLORS[task.energy] || '#60a5fa'
  const isDone = task.status === 'done'
  const isSkipped = task.status === 'skipped'

  return (
    <div
      style={{
        background: isDone || isSkipped ? 'var(--bg-primary)' : 'var(--bg-card)',
        border: `1px solid ${isDone || isSkipped ? 'var(--border)' : borderColor + '40'}`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        opacity: isDone || isSkipped ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* 顶部行 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {/* 状态图标 */}
          <div
            onClick={(e) => {
              e.stopPropagation()
              onUpdate(task.id, { status: isDone ? 'todo' : 'done' })
            }}
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `2px solid ${isDone ? 'var(--accent-green)' : 'var(--border)'}`,
              background: isDone ? 'var(--accent-green)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            {isDone && <span style={{ color: 'var(--bg-primary)', fontSize: 12, fontWeight: 700 }}>✓</span>}
          </div>
          <EnergyTag energy={task.energy} />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!isDone && !isSkipped && onStartTimer && (
            <button
              onClick={(e) => { e.stopPropagation(); onStartTimer(task.id) }}
              style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                background: 'var(--accent-pink)20', color: 'var(--accent-pink)',
              }}
            >
              ▶ 专注
            </button>
          )}
          {!isDone && !isSkipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: 'skipped' }) }}
              style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                background: 'var(--text-muted)20', color: 'var(--text-muted)',
              }}
            >
              跳过
            </button>
          )}
          {isSkipped && (
            <button
              onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: 'todo' }) }}
              style={{
                fontSize: 10, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
                background: 'var(--text-muted)20', color: 'var(--text-secondary)',
              }}
            >
              恢复
            </button>
          )}
        </div>
      </div>

      {/* 标题 */}
      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          marginTop: 8,
          color: isDone || isSkipped ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: isSkipped ? 'line-through' : 'none',
        }}
      >
        {task.title}
      </div>

      {/* 元信息 */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 12 }}>
        <span>{task.estimatedMin}min</span>
        {task.actualMin > 0 && <span>实际 {task.actualMin}min</span>}
        <span style={{ color: 'var(--accent-yellow)' }}>+{task.points}分</span>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div
          style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onDelete(task.id)}
            style={{
              fontSize: 11, padding: '6px 12px', borderRadius: 6,
              background: 'var(--accent-red)15', color: 'var(--accent-red)',
            }}
          >
            删除任务
          </button>
        </div>
      )}
    </div>
  )
}
