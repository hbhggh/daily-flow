export default function AchievementCard({ achievement, unlocked, unlockedAt }) {
  return (
    <div style={{
      background: unlocked ? 'var(--bg-card)' : 'var(--bg-primary)',
      border: `1px solid ${unlocked ? 'var(--accent-purple)30' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '14px',
      opacity: unlocked ? 1 : 0.5,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 解锁光效 */}
      {unlocked && (
        <div style={{
          position: 'absolute', top: 0, right: 0, width: 40, height: 40,
          background: 'radial-gradient(circle at top right, var(--accent-purple)20, transparent)',
        }} />
      )}

      <div style={{ fontSize: 28, marginBottom: 6 }}>
        {unlocked ? achievement.icon : '🔒'}
      </div>
      <div style={{
        fontSize: 12, fontWeight: 700,
        color: unlocked ? 'var(--text-primary)' : 'var(--text-muted)',
      }}>
        {achievement.title}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
        {achievement.desc}
      </div>
      {unlocked && unlockedAt && (
        <div style={{ fontSize: 9, color: 'var(--accent-purple)', marginTop: 6 }}>
          {new Date(unlockedAt).toLocaleDateString('zh-CN')} 解锁
        </div>
      )}
      {achievement.reward > 0 && (
        <div style={{
          fontSize: 10, color: 'var(--accent-yellow)', marginTop: 4, fontWeight: 600,
        }}>
          +{achievement.reward} 积分
        </div>
      )}
    </div>
  )
}
