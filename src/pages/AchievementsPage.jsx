import { useAchievements, ACHIEVEMENTS } from '../stores/useAchievements'
import AchievementCard from '../components/AchievementCard'

const CATEGORIES = [
  { id: 'focus', label: '专注', color: 'var(--accent-pink)' },
  { id: 'streak', label: '连续', color: 'var(--accent-green)' },
  { id: 'project', label: '项目', color: 'var(--accent-purple)' },
  { id: 'points', label: '积分', color: 'var(--accent-yellow)' },
]

export default function AchievementsPage() {
  const { unlocked, streak } = useAchievements()
  const unlockedCount = Object.keys(unlocked).length
  const totalCount = ACHIEVEMENTS.length

  return (
    <div className="app-content">
      {/* 统计头部 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          成就墙
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
          <div style={{
            padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            flex: 1, textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-purple)' }}>
              {unlockedCount}/{totalCount}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>已解锁</div>
          </div>
          <div style={{
            padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            flex: 1, textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent-green)' }}>
              {streak}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>连续天数</div>
          </div>
        </div>
      </div>

      {/* 分类展示 */}
      {CATEGORIES.map((cat) => {
        const items = ACHIEVEMENTS.filter((a) => a.category === cat.id)
        return (
          <div key={cat.id} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: cat.color, marginBottom: 8 }}>
              {cat.label}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {items.map((a) => (
                <AchievementCard
                  key={a.id}
                  achievement={a}
                  unlocked={!!unlocked[a.id]}
                  unlockedAt={unlocked[a.id]?.unlockedAt}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
