import { useState } from 'react'
import { useProjects } from '../stores/useProjects'
import AISheet from '../components/AISheet'
import { useToast } from '../components/Toast'

const PROJECT_COLORS = ['#4ade80', '#f472b6', '#60a5fa', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee']

export default function ProjectDetailPage({ projectId, onBack }) {
  const { getProject, updateProject, addMilestone, toggleMilestone, removeMilestone, removeProject } = useProjects()
  const project = getProject(projectId)
  const showToast = useToast()
  const [newMilestone, setNewMilestone] = useState('')
  const [editing, setEditing] = useState(false)
  const [showAI, setShowAI] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  if (!project) return null

  const progress = useProjects.getState().getProjectProgress(projectId)

  const handleAddMilestone = () => {
    if (!newMilestone.trim()) return
    addMilestone(projectId, newMilestone.trim())
    setNewMilestone('')
    showToast('里程碑已添加', 'var(--accent-green)')
  }

  const handleToggle = (milestoneId) => {
    const ms = project.milestones.find((m) => m.id === milestoneId)
    toggleMilestone(projectId, milestoneId)
    if (ms && !ms.done) {
      showToast('里程碑完成！', 'var(--accent-purple)')
    }
  }

  const startEdit = () => {
    setEditTitle(project.title)
    setEditDesc(project.description)
    setEditing(true)
  }

  const saveEdit = () => {
    updateProject(projectId, { title: editTitle, description: editDesc })
    setEditing(false)
  }

  return (
    <div className="app-content">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        style={{
          background: 'transparent', color: 'var(--text-secondary)',
          fontSize: 13, marginBottom: 16, padding: '4px 0',
        }}
      >
        ← 返回项目列表
      </button>

      {/* 项目标题 + 进度 */}
      <div style={{
        background: 'var(--bg-card)', borderRadius: 'var(--radius)',
        borderTop: `4px solid ${project.color}`, padding: 20, marginBottom: 16,
      }}>
        {editing ? (
          <div>
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, marginBottom: 8,
              }}
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="项目描述..."
              style={{
                width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 12, minHeight: 60, resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateProject(projectId, { color: c })}
                  style={{
                    width: 24, height: 24, borderRadius: '50%', background: c,
                    border: project.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={saveEdit} style={{
                padding: '6px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-green)', color: 'var(--bg-primary)', fontSize: 12, fontWeight: 600,
              }}>保存</button>
              <button onClick={() => setEditing(false)} style={{
                padding: '6px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 12,
              }}>取消</button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{project.title}</div>
                {project.description && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{project.description}</div>
                )}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: project.color }}>{progress.percentage}%</div>
            </div>
            <button onClick={startEdit} style={{
              fontSize: 11, color: 'var(--text-muted)', marginTop: 8, background: 'transparent', padding: 0,
            }}>编辑项目</button>
          </div>
        )}
      </div>

      {/* AI 拆解按钮 */}
      <button
        onClick={() => setShowAI(true)}
        style={{
          width: '100%', padding: '10px', borderRadius: 'var(--radius-sm)', marginBottom: 16,
          background: 'var(--accent-blue)15', border: '1px solid var(--accent-blue)30',
          color: 'var(--accent-blue)', fontSize: 12, fontWeight: 600,
        }}
      >
        🤖 AI 自动拆解里程碑
      </button>

      {/* 里程碑列表 */}
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        里程碑 ({progress.completed}/{progress.total})
      </div>

      {project.milestones.map((ms, i) => (
        <div
          key={ms.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', marginBottom: 8,
            background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
          }}
        >
          <div
            onClick={() => handleToggle(ms.id)}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              border: `2px solid ${ms.done ? project.color : 'var(--border)'}`,
              background: ms.done ? project.color : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            {ms.done && <span style={{ color: 'var(--bg-primary)', fontSize: 12, fontWeight: 700 }}>✓</span>}
          </div>
          <span style={{
            flex: 1, fontSize: 13,
            color: ms.done ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: ms.done ? 'line-through' : 'none',
          }}>
            {ms.title}
          </span>
          <button
            onClick={() => removeMilestone(projectId, ms.id)}
            style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: 14, padding: '0 4px' }}
          >
            ×
          </button>
        </div>
      ))}

      {/* 添加里程碑 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <input
          placeholder="新里程碑..."
          value={newMilestone}
          onChange={(e) => setNewMilestone(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddMilestone()}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: 12,
          }}
        />
        <button
          onClick={handleAddMilestone}
          style={{
            padding: '8px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-green)', color: 'var(--bg-primary)', fontSize: 12, fontWeight: 600,
          }}
        >
          +
        </button>
      </div>

      {/* 状态切换 + 删除 */}
      <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            const next = project.status === 'active' ? 'paused' : 'active'
            updateProject(projectId, { status: next })
            showToast(next === 'active' ? '项目已激活' : '项目已暂停', 'var(--text-secondary)')
          }}
          style={{
            flex: 1, padding: '10px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-elevated)', color: 'var(--text-secondary)', fontSize: 12,
          }}
        >
          {project.status === 'active' ? '暂停项目' : '恢复项目'}
        </button>
        <button
          onClick={() => {
            if (confirm('确定删除此项目？')) {
              removeProject(projectId)
              onBack()
            }
          }}
          style={{
            padding: '10px 16px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-red)15', color: 'var(--accent-red)', fontSize: 12,
          }}
        >
          删除
        </button>
      </div>

      {/* AI 拆解面板 */}
      <AISheet
        open={showAI}
        mode="decompose"
        projectId={projectId}
        onClose={() => setShowAI(false)}
      />
    </div>
  )
}
