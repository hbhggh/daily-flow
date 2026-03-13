import { useEffect, useState } from 'react'

export default function MilestoneModal({ achievement, onClose }) {
  const [particles, setParticles] = useState([])

  useEffect(() => {
    // 生成撒花粒子
    const colors = ['#4ade80', '#f472b6', '#60a5fa', '#fbbf24', '#a78bfa']
    const ps = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      size: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1.5,
    }))
    setParticles(ps)
  }, [])

  if (!achievement) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0, 0, 0, 0.8)', zIndex: 300,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* 撒花粒子 */}
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: p.size > 8 ? '2px' : '50%',
            background: p.color,
            animation: `confettiFall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}

      {/* 成就卡片 */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          textAlign: 'center', padding: '40px 30px',
          background: 'var(--bg-card)', borderRadius: 20,
          border: '2px solid var(--accent-purple)40',
          maxWidth: 320, width: '85%',
          animation: 'achievementPop 0.4s ease-out',
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 12 }}>{achievement.icon}</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-purple)' }}>
          成就解锁！
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
          {achievement.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
          {achievement.desc}
        </div>
        {achievement.reward > 0 && (
          <div style={{
            marginTop: 16, padding: '8px 20px', borderRadius: 20,
            background: 'var(--accent-yellow)15', display: 'inline-block',
          }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-yellow)' }}>
              +{achievement.reward} 积分
            </span>
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%', marginTop: 20, padding: '12px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-purple)', color: '#fff',
            fontSize: 14, fontWeight: 700,
          }}
        >
          太棒了！
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes achievementPop {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
