import { useState } from 'react'
import { useProjects } from '../stores/useProjects'
import ProjectCard from '../components/ProjectCard'
import ProjectDetailPage from './ProjectDetailPage'
import PointsBadge from '../components/PointsBadge'
import SpendSheet from '../components/SpendSheet'
import { useToast } from '../components/Toast'

const PROJECT_COLORS = ['#4ade80', '#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee']

export default function DashboardPage() {
  const { projects, addProject, getProjectProgress } = useProjects()
  const showToast = useToast()
  const [selectedProject, setSelectedProject] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showSpend, setShowSpend] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#4ade80')

  // 如果选中了项目，显示详情页
  if (selectedProject) {
    return (
      <ProjectDetailPage
        projectId={selectedProject}
        onBack={() => setSelectedProject(null)}
      />
    )
  }

  const activeProjects = projects.filter((p) => p.status === 'active')
  const otherProjects = projects.filter((p) => p.status !== 'active')

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addProject({ title: newTitle.trim(), description: newDesc.trim(), color: newColor })
    setNewTitle('')
    setNewDesc('')
    setShowAdd(false)
    showToast('项目已创建', 'var(--accent-green)')
  }

  return (
    <div className="app-content">
      {/* 积分徽章 */}
      <PointsBadge onClick={() => setShowSpend(true)} />

      {/* 标题 */}
      <div style={{
        fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16,
      }}>
        项目仪表盘
      </div>

      {/* 活跃项目 */}
      {activeProjects.length === 0 && otherProjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>◈</div>
          <div>还没有项目</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>创建一个项目来追踪长期进度</div>
        </div>
      )}

      {activeProjects.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
            进行中 ({activeProjects.length})
          </div>
          {activeProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              progress={getProjectProgress(p.id)}
              onClick={() => setSelectedProject(p.id)}
            />
          ))}
        </div>
      )}

      {otherProjects.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
            其他
          </div>
          {otherProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              progress={getProjectProgress(p.id)}
              onClick={() => setSelectedProject(p.id)}
            />
          ))}
        </div>
      )}

      {/* 添加项目 FAB */}
      <button
        onClick={() => setShowAdd(true)}
        style={{
          position: 'fixed', bottom: 'calc(72px + var(--safe-bottom))',
          right: 'calc(50% - 224px)',
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--accent-green)', color: 'var(--bg-primary)',
          fontSize: 24, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px #4ade8040', zIndex: 50,
        }}
      >
        +
      </button>

      <SpendSheet open={showSpend} onClose={() => setShowSpend(false)} />

      {/* 添加项目面板 */}
      {showAdd && (
        <div className="sheet-overlay" onClick={() => setShowAdd(false)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              创建新项目
            </div>

            <input
              autoFocus
              placeholder="项目名称（如：论文、日语 N2）"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13,
              }}
            />

            <textarea
              placeholder="项目描述（可选）"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 12, marginTop: 8,
                minHeight: 60, resize: 'vertical',
              }}
            />

            {/* 颜色选择 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: newColor === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                  }}
                />
              ))}
            </div>

            <button
              onClick={handleAdd}
              disabled={!newTitle.trim()}
              style={{
                width: '100%', height: 44, borderRadius: 'var(--radius-sm)', marginTop: 16,
                background: newTitle.trim() ? 'var(--accent-green)' : 'var(--bg-elevated)',
                color: newTitle.trim() ? 'var(--bg-primary)' : 'var(--text-muted)',
                fontSize: 14, fontWeight: 700,
              }}
            >
              创建项目
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
