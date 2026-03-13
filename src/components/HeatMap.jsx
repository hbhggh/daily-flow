import { useMemo } from 'react'
import { getDateStore } from '../stores/storage'

const COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353']

export default function HeatMap({ days = 30 }) {
  const data = useMemo(() => {
    const result = []
    const today = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const tasks = getDateStore('daily', key) || []
      const done = tasks.filter((t) => t.status === 'done').length
      const level = done === 0 ? 0 : done <= 2 ? 1 : done <= 4 ? 2 : done <= 6 ? 3 : 4
      result.push({ date: key, count: done, level })
    }
    return result
  }, [days])

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
        最近 {days} 天活跃度
      </div>
      <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {data.map((d) => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} 任务完成`}
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: COLORS[d.level],
              transition: 'background 0.2s',
            }}
          />
        ))}
      </div>
      {/* 图例 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 9, color: 'var(--text-muted)' }}>
        <span>少</span>
        {COLORS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        <span>多</span>
      </div>
    </div>
  )
}
