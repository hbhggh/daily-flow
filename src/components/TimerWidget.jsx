import { useState, useEffect, useRef, useCallback } from 'react'
import { useTimer } from '../stores/useTimer'
import { usePoints } from '../stores/usePoints'
import { useDailyPipeline } from '../stores/useDailyPipeline'
import { useToast } from './Toast'
import { formatDuration } from '../utils/time'
import { playCompletionSound } from '../utils/audio'

const PRESETS = [
  { label: '正计时', mode: 'countup', minutes: null },
  { label: '45 min', mode: 'countdown', minutes: 45 },
  { label: '60 min', mode: 'countdown', minutes: 60 },
  { label: '90 min', mode: 'countdown', minutes: 90 },
  { label: '120 min', mode: 'countdown', minutes: 120 },
  { label: '180 min', mode: 'countdown', minutes: 180 },
]

export default function TimerWidget({ boundTaskId, onClose }) {
  const timer = useTimer()
  const earn = usePoints((s) => s.earn)
  const updateTask = useDailyPipeline((s) => s.updateTask)
  const tasks = useDailyPipeline((s) => s.tasks)
  const showToast = useToast()

  const [elapsed, setElapsed] = useState(0)
  const [showPresets, setShowPresets] = useState(timer.status === 'idle')
  const [customMin, setCustomMin] = useState('')
  const completedRef = useRef(false)

  // requestAnimationFrame 刷新显示
  useEffect(() => {
    if (timer.status !== 'running') return
    let raf
    const tick = () => {
      setElapsed(timer.getElapsedMs())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [timer.status])

  // 暂停时也显示正确时间
  useEffect(() => {
    if (timer.status === 'paused') {
      setElapsed(timer.getElapsedMs())
    }
  }, [timer.status])

  // iOS 后台恢复：visibilitychange 时校准
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && timer.status === 'running') {
        setElapsed(timer.getElapsedMs())
        // 检查倒计时是否完成
        if (timer.mode === 'countdown' && timer.isCompleted() && !completedRef.current) {
          completedRef.current = true
          playCompletionSound()
          showToast('倒计时结束！', 'var(--accent-pink)')
        }
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [timer.status, timer.mode])

  // 检查倒计时完成（前台运行时）
  useEffect(() => {
    if (timer.status === 'running' && timer.mode === 'countdown' && !completedRef.current) {
      if (elapsed >= (timer.targetMinutes || 0) * 60000) {
        completedRef.current = true
        playCompletionSound()
        showToast('倒计时结束！继续专注或停止结算', 'var(--accent-pink)')
      }
    }
  }, [elapsed, timer.status, timer.mode, timer.targetMinutes])

  const handleStart = (mode, minutes) => {
    completedRef.current = false
    timer.start(mode, minutes, boundTaskId)
    setShowPresets(false)
  }

  const handleStop = useCallback(() => {
    const record = timer.stop()
    if (record && record.pointsEarned > 0) {
      earn(record.pointsEarned, 'focus_mining', `专注 ${Math.floor(record.durationMs / 60000)} 分钟`, record.taskId)
      showToast(`⛏ +${record.pointsEarned} 积分 (专注挖矿)`, 'var(--accent-yellow)')

      // 更新关联任务的实际时间
      if (record.taskId) {
        const task = tasks.find((t) => t.id === record.taskId)
        if (task) {
          updateTask(record.taskId, {
            actualMin: task.actualMin + Math.floor(record.durationMs / 60000),
          })
        }
      }
    }
    completedRef.current = false
    if (onClose) onClose()
  }, [timer, earn, tasks, updateTask, showToast, onClose])

  const minutes = Math.floor(elapsed / 60000)
  const boundTask = boundTaskId ? tasks.find((t) => t.id === boundTaskId) : null

  // 倒计时进度
  const progress = timer.mode === 'countdown' && timer.targetMinutes
    ? Math.min(1, elapsed / (timer.targetMinutes * 60000))
    : 0

  // 圆环参数
  const radius = 85
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - progress)

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: 'var(--radius)',
      border: '1px solid var(--accent-pink)30',
      padding: 20,
      marginBottom: 16,
    }}>
      {/* 关联任务显示 */}
      {boundTask && (
        <div style={{
          fontSize: 11, color: 'var(--accent-pink)', marginBottom: 12,
          padding: '4px 10px', background: 'var(--accent-pink)15',
          borderRadius: 'var(--radius-sm)', display: 'inline-block',
        }}>
          🎯 {boundTask.title}
        </div>
      )}

      {/* 预设选择 */}
      {showPresets && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
            选择计时模式
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleStart(p.mode, p.minutes)}
                style={{
                  padding: '12px 8px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 12, fontWeight: 600,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* 自定义时长 */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              type="number"
              placeholder="自定义分钟"
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              style={{
                flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 12,
              }}
            />
            <button
              onClick={() => {
                const m = parseInt(customMin)
                if (m > 0) handleStart('countdown', m)
              }}
              style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-pink)', color: '#fff', fontSize: 12, fontWeight: 600,
              }}
            >
              开始
            </button>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                width: '100%', marginTop: 8, padding: '8px', borderRadius: 'var(--radius-sm)',
                background: 'transparent', color: 'var(--text-muted)', fontSize: 11,
              }}
            >
              取消
            </button>
          )}
        </div>
      )}

      {/* 计时器显示 */}
      {!showPresets && (
        <div style={{ textAlign: 'center' }}>
          {/* 圆环 */}
          <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
            <svg width="200" height="200" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="100" cy="100" r={radius}
                fill="none" stroke="var(--bg-elevated)" strokeWidth="6"
              />
              {timer.mode === 'countdown' && (
                <circle
                  cx="100" cy="100" r={radius}
                  fill="none" stroke="var(--accent-pink)" strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                />
              )}
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)', textAlign: 'center',
            }}>
              <div style={{
                fontSize: 28, fontWeight: 700, color: 'var(--accent-pink)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {timer.mode === 'countdown'
                  ? formatDuration(Math.max(0, (timer.targetMinutes || 0) * 60000 - elapsed))
                  : formatDuration(elapsed)
                }
              </div>
              <div style={{ fontSize: 12, color: 'var(--accent-yellow)', marginTop: 4 }}>
                ⛏ {minutes} pts
              </div>
            </div>
          </div>

          {/* 模式标签 */}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {timer.mode === 'countdown'
              ? `倒计时 ${timer.targetMinutes} 分钟${completedRef.current ? ' (已到时)' : ''}`
              : '正计时'
            }
          </div>

          {/* 控制按钮 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            {timer.status === 'running' ? (
              <button
                onClick={() => timer.pause()}
                style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-yellow)20', color: 'var(--accent-yellow)',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                ⏸ 暂停
              </button>
            ) : (
              <button
                onClick={() => timer.resume()}
                style={{
                  padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--accent-green)20', color: 'var(--accent-green)',
                  fontSize: 13, fontWeight: 600,
                }}
              >
                ▶ 继续
              </button>
            )}
            <button
              onClick={handleStop}
              style={{
                padding: '10px 24px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-red)20', color: 'var(--accent-red)',
                fontSize: 13, fontWeight: 600,
              }}
            >
              ⏹ 结束
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
