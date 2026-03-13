import { useState, useMemo } from 'react'
import { useDailyPipeline } from '../stores/useDailyPipeline'
import { usePoints } from '../stores/usePoints'
import { useTimer } from '../stores/useTimer'
import { getDateStore } from '../stores/storage'
import HeatMap from '../components/HeatMap'
import AISheet from '../components/AISheet'
import DataManager from '../components/DataManager'
import { todayKey } from '../utils/time'

export default function ReviewPage() {
  const tasks = useDailyPipeline((s) => s.tasks)
  const transactions = usePoints((s) => s.transactions)
  const focusRecords = useTimer((s) => s.focusRecords)
  const todayRecords = useMemo(() => {
    const key = todayKey()
    return focusRecords.filter((r) => r.date === key)
  }, [focusRecords])
  const [showAI, setShowAI] = useState(false)
  const [showData, setShowData] = useState(false)

  const today = todayKey()
  const savedReview = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(`dfp:review:${today}`) || 'null')
    } catch { return null }
  }, [today])

  // 今日统计
  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const earned = transactions.filter((t) => t.type === 'earn').reduce((s, t) => s + t.amount, 0)
    const spent = transactions.filter((t) => t.type === 'spend').reduce((s, t) => s + t.amount, 0)
    const focusMs = todayRecords.reduce((s, r) => s + r.durationMs, 0)
    const focusMin = Math.floor(focusMs / 60000)
    return { total, done, earned, spent, net: earned - spent, focusMin }
  }, [tasks, transactions, todayRecords])

  // 最近 7 天积分净值
  const weeklyNet = useMemo(() => {
    const result = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const txns = getDateStore('points', key) || []
      const net = txns.reduce((s, t) => t.type === 'earn' ? s + t.amount : s - t.amount, 0)
      result.push({ date: key.slice(5), net })
    }
    return result
  }, [])

  const maxNetAbs = Math.max(1, ...weeklyNet.map((d) => Math.abs(d.net)))

  return (
    <div className="app-content">
      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        复盘 · {today}
      </div>

      {/* 今日统计卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
        <StatCard label="任务完成" value={`${stats.done}/${stats.total}`} color="var(--accent-green)" />
        <StatCard label="积分净值" value={`${stats.net >= 0 ? '+' : ''}${stats.net}`}
          color={stats.net >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)'} />
        <StatCard label="专注时间" value={`${stats.focusMin}min`} color="var(--accent-pink)" />
      </div>

      {/* 7 天积分柱状图 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
          近 7 天积分趋势
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
          {weeklyNet.map((d) => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: '100%',
                height: `${Math.max(4, Math.abs(d.net) / maxNetAbs * 60)}px`,
                borderRadius: '4px 4px 0 0',
                background: d.net >= 0 ? 'var(--accent-green)' : 'var(--accent-pink)',
                opacity: 0.8,
              }} />
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{d.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 热力图 */}
      <HeatMap days={30} />

      {/* AI 复盘按钮 */}
      {!savedReview && (
        <button
          onClick={() => setShowAI(true)}
          style={{
            width: '100%', padding: '14px', borderRadius: 'var(--radius)',
            background: 'var(--accent-blue)15', border: '1px solid var(--accent-blue)30',
            color: 'var(--accent-blue)', fontSize: 13, fontWeight: 700, marginBottom: 16,
          }}
        >
          📊 开始 AI 复盘
        </button>
      )}

      {/* 已保存的复盘结果 */}
      {savedReview && !savedReview.parseError && (
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius)',
          border: '1px solid var(--accent-blue)25', padding: 16, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-blue)' }}>AI 复盘报告</div>
            {savedReview.score && (
              <div style={{
                fontSize: 20, fontWeight: 700,
                color: savedReview.score >= 80 ? 'var(--accent-green)' : savedReview.score >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)',
              }}>
                {savedReview.score}分
              </div>
            )}
          </div>
          {savedReview.summary && (
            <div style={{ fontSize: 12, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 8 }}>
              {savedReview.summary}
            </div>
          )}
          {savedReview.highlights?.map((h, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--accent-green)', padding: '2px 0' }}>✅ {h}</div>
          ))}
          {savedReview.improvements?.map((imp, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--accent-yellow)', padding: '2px 0' }}>💡 {imp}</div>
          ))}
          {savedReview.encouragement && (
            <div style={{ fontSize: 11, color: 'var(--accent-blue)', marginTop: 8, fontStyle: 'italic' }}>
              {savedReview.encouragement}
            </div>
          )}
        </div>
      )}

      {/* 专注记录 */}
      {todayRecords.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
            今日专注记录
          </div>
          {todayRecords.map((r) => (
            <div key={r.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', marginBottom: 4,
              background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', fontSize: 12,
            }}>
              <span style={{ color: 'var(--text-primary)' }}>
                {Math.floor(r.durationMs / 60000)} 分钟
              </span>
              <span style={{ color: 'var(--accent-yellow)' }}>
                +{r.pointsEarned} pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 数据管理入口 */}
      <button
        onClick={() => setShowData(true)}
        style={{
          width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600,
        }}
      >
        ⚙ 数据管理（导出 / 导入）
      </button>

      <AISheet open={showAI} mode="evening" onClose={() => setShowAI(false)} />
      <DataManager open={showData} onClose={() => setShowData(false)} />
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{
      padding: '12px 8px', borderRadius: 'var(--radius-sm)',
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
