import { useState, useMemo } from 'react'
import { useDailyPipeline } from '../stores/useDailyPipeline'
import { usePoints } from '../stores/usePoints'
import { useTimer } from '../stores/useTimer'
import TaskNode from '../components/TaskNode'
import TimerWidget from '../components/TimerWidget'
import PointsBadge from '../components/PointsBadge'
import SpendSheet from '../components/SpendSheet'
import AISheet from '../components/AISheet'
import { useToast } from '../components/Toast'

const ENERGY_OPTIONS = [
  { value: 'high', label: '⚡ 高精力' },
  { value: 'low', label: '☕ 低精力' },
  { value: 'physical', label: '🏃 体力' },
]

export default function PipelinePage() {
  const { date, tasks, addTask, updateTask, removeTask } = useDailyPipeline()
  const earn = usePoints((s) => s.earn)
  const timerStatus = useTimer((s) => s.status)
  const showToast = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [showSpend, setShowSpend] = useState(false)
  const [timerTaskId, setTimerTaskId] = useState(null)
  const [showTimer, setShowTimer] = useState(false)
  const [aiMode, setAiMode] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [newEnergy, setNewEnergy] = useState('low')
  const [newMinutes, setNewMinutes] = useState('30')
  const [newPoints, setNewPoints] = useState('10')

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const skipped = tasks.filter((t) => t.status === 'skipped').length
    const totalPoints = tasks.filter((t) => t.status === 'done').reduce((s, t) => s + t.points, 0)
    const pct = total > 0 ? Math.round((done / total) * 100) : 0
    return { total, done, skipped, totalPoints, pct }
  }, [tasks])

  const handleAdd = () => {
    if (!newTitle.trim()) return
    addTask({
      title: newTitle.trim(),
      energy: newEnergy,
      estimatedMin: parseInt(newMinutes) || 30,
      points: parseInt(newPoints) || 10,
    })
    setNewTitle('')
    setNewMinutes('30')
    setNewPoints('10')
    setShowAdd(false)
    showToast('任务已添加', 'var(--accent-green)')
  }

  const handleStatusChange = (id, partial) => {
    const prevTask = tasks.find((t) => t.id === id)
    updateTask(id, partial)
    if (partial.status === 'done' && prevTask && prevTask.status !== 'done') {
      earn(prevTask.points, 'task_complete', `完成: ${prevTask.title}`, id)
      showToast(`+${prevTask.points} 积分`, 'var(--accent-yellow)')
    }
  }

  return (
    <div className="app-content">
      {/* 积分徽章 */}
      <PointsBadge onClick={() => setShowSpend(true)} />

      {/* 计时器 */}
      {(showTimer || timerStatus !== 'idle') && (
        <TimerWidget
          boundTaskId={timerTaskId}
          onClose={() => { setShowTimer(false); setTimerTaskId(null) }}
        />
      )}

      {/* 日期 + 统计 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{date}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              每日 Pipeline
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {stats.done}/{stats.total} 完成
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-yellow)' }}>
              +{stats.totalPoints} 分
            </div>
          </div>
        </div>
        {/* 进度条 */}
        <div style={{
          marginTop: 8, height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${stats.pct}%`,
            background: 'linear-gradient(90deg, var(--accent-green), #22d3ee)',
            borderRadius: 2, transition: 'width 0.4s',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 600, marginTop: 4, textAlign: 'right' }}>
          {stats.pct}%
        </div>
      </div>

      {/* Pipeline 任务列表 */}
      <div>
        {tasks.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>∅</div>
            <div>今天还没有任务</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>点击下方 + 添加任务</div>
          </div>
        )}
        {tasks.map((task, i) => (
          <div key={task.id}>
            {i > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0' }}>
                <svg width="2" height="20">
                  <line
                    x1="1" y1="0" x2="1" y2="20"
                    stroke={tasks[i - 1].status === 'done' ? 'var(--accent-green)' : 'var(--border)'}
                    strokeWidth="2"
                    strokeDasharray={tasks[i - 1].status === 'done' ? 'none' : '4 4'}
                  />
                </svg>
              </div>
            )}
            <TaskNode
              task={task}
              onUpdate={handleStatusChange}
              onDelete={removeTask}
              onStartTimer={(taskId) => { setTimerTaskId(taskId); setShowTimer(true) }}
            />
          </div>
        ))}
      </div>

      {/* FAB 按钮组 */}
      <div style={{
        position: 'fixed', bottom: `calc(72px + var(--safe-bottom))`,
        right: 'calc(50% - 224px)', display: 'flex', gap: 10, zIndex: 50,
      }}>
        {/* AI 按钮组 */}
        <button
          onClick={() => setAiMode('morning')}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--accent-blue)', color: '#fff',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px #60a5fa40',
          }}
        >
          🌅
        </button>
        <button
          onClick={() => setAiMode('observe')}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--accent-blue)90', color: '#fff',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          🔍
        </button>
        <button
          onClick={() => setAiMode('evening')}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--accent-blue)80', color: '#fff',
            fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          📊
        </button>
        {timerStatus === 'idle' && (
          <button
            onClick={() => { setTimerTaskId(null); setShowTimer(true) }}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent-pink)', color: '#fff',
              fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px #f472b640',
            }}
          >
            ⏱
          </button>
        )}
        <button
          onClick={() => setShowAdd(true)}
          style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent-green)', color: 'var(--bg-primary)',
            fontSize: 24, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px #4ade8040',
          }}
        >
          +
        </button>
      </div>

      {/* 积分消费面板 */}
      <SpendSheet open={showSpend} onClose={() => setShowSpend(false)} />

      {/* 添加任务面板 */}
      {showAdd && (
        <div className="sheet-overlay" onClick={() => setShowAdd(false)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
              添加任务
            </div>

            {/* 标题 */}
            <input
              autoFocus
              placeholder="任务名称..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 13,
              }}
            />

            {/* 精力标签选择 */}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              {ENERGY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNewEnergy(opt.value)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
                    fontSize: 11, fontWeight: 600,
                    background: newEnergy === opt.value ? 'var(--bg-elevated)' : 'var(--bg-input)',
                    color: newEnergy === opt.value ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: `1px solid ${newEnergy === opt.value ? 'var(--accent-green)40' : 'var(--border)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 预估时间 + 积分 */}
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  预估时间 (分钟)
                </label>
                <input
                  type="number"
                  value={newMinutes}
                  onChange={(e) => setNewMinutes(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 13,
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  完成积分
                </label>
                <input
                  type="number"
                  value={newPoints}
                  onChange={(e) => setNewPoints(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 13,
                  }}
                />
              </div>
            </div>

            {/* 提交 */}
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
              添加
            </button>
          </div>
        </div>
      )}

      {/* AI Sheet */}
      <AISheet open={!!aiMode} mode={aiMode} onClose={() => setAiMode(null)} />
    </div>
  )
}
