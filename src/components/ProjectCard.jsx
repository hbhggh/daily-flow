export default function ProjectCard({ project, progress, onClick }) {
  const { total, completed, percentage } = progress

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderTop: `4px solid ${project.color}`,
        borderRadius: 'var(--radius)',
        padding: '16px',
        marginBottom: 12,
      }}
    >
      {/* 状态标签 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
          background: project.status === 'active' ? 'var(--accent-green)15' : 'var(--text-muted)15',
          color: project.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)',
        }}>
          {project.status === 'active' ? '进行中' : project.status === 'paused' ? '暂停' : '已完成'}
        </span>
        <span style={{ fontSize: 20, fontWeight: 700, color: project.color }}>
          {percentage}%
        </span>
      </div>

      {/* 标题 */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginTop: 8 }}>
        {project.title}
      </div>

      {/* 描述 */}
      {project.description && (
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>
          {project.description.slice(0, 60)}{project.description.length > 60 ? '...' : ''}
        </div>
      )}

      {/* 里程碑分段进度条 */}
      {total > 0 && (
        <div style={{ display: 'flex', gap: 3, marginTop: 12 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1, height: 6, borderRadius: 3,
                background: i < completed ? project.color : 'var(--bg-elevated)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* 里程碑统计 */}
      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
        {completed}/{total} 里程碑
      </div>
    </button>
  )
}
