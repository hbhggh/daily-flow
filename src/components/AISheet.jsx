import { useState } from 'react'
import { callClaude, hasApiKey, setApiKey, getTodayUsage } from '../ai/client'
import { parseAIResponse } from '../ai/parser'
import {
  projectDecomposePrompt,
  morningPlanPrompt,
  dayObservePrompt,
  eveningReviewPrompt,
} from '../ai/prompts'
import { useDailyPipeline } from '../stores/useDailyPipeline'
import { usePoints } from '../stores/usePoints'
import { useProjects } from '../stores/useProjects'
import { useTimer } from '../stores/useTimer'
import { getDateStore } from '../stores/storage'
import { yesterdayKey } from '../utils/time'
import { useToast } from './Toast'

export default function AISheet({ open, mode, projectId, onClose }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const showToast = useToast()

  const addTask = useDailyPipeline((s) => s.addTask)
  const tasks = useDailyPipeline((s) => s.tasks)
  const projects = useProjects((s) => s.projects)
  const addMilestone = useProjects((s) => s.addMilestone)
  const pointsTxns = usePoints((s) => s.transactions)
  const focusRecords = useTimer((s) => s.focusRecords)
  const todayRecords = focusRecords.filter((r) => r.date === new Date().toISOString().slice(0, 10))

  if (!open) return null

  const handleSetKey = () => {
    if (apiKeyInput.trim()) {
      setApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      showToast('API Key 已保存', 'var(--accent-green)')
    }
  }

  const runAI = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let prompt
      let purpose

      switch (mode) {
        case 'decompose': {
          const project = projects.find((p) => p.id === projectId)
          if (!project) throw new Error('项目不存在')
          prompt = projectDecomposePrompt(project)
          purpose = 'project_decompose'
          break
        }
        case 'morning': {
          const activeProjects = projects.filter((p) => p.status === 'active')
          const yesterdayTasks = getDateStore('daily', yesterdayKey()) || []
          prompt = morningPlanPrompt(activeProjects, yesterdayTasks, tasks)
          purpose = 'morning_plan'
          break
        }
        case 'observe': {
          const earned = pointsTxns.filter((t) => t.type === 'earn').reduce((s, t) => s + t.amount, 0)
          const spent = pointsTxns.filter((t) => t.type === 'spend').reduce((s, t) => s + t.amount, 0)
          const focusMin = todayRecords.reduce((s, r) => s + Math.floor(r.durationMs / 60000), 0)
          prompt = dayObservePrompt(tasks, earned - spent, focusMin)
          purpose = 'day_observe'
          break
        }
        case 'evening': {
          const earned = pointsTxns.filter((t) => t.type === 'earn').reduce((s, t) => s + t.amount, 0)
          const spent = pointsTxns.filter((t) => t.type === 'spend').reduce((s, t) => s + t.amount, 0)
          prompt = eveningReviewPrompt(tasks, earned, spent, todayRecords)
          purpose = 'evening_review'
          break
        }
        default:
          throw new Error('未知模式')
      }

      const response = await callClaude(prompt.messages, purpose, { system: prompt.system })

      if (mode === 'observe') {
        // 日间观察返回纯文本
        setResult({ raw: response.content?.[0]?.text || '', mode: 'observe' })
      } else {
        const parsed = parseAIResponse(response)
        setResult({ ...parsed, mode })
      }
    } catch (e) {
      setError(e.message)
    }

    setLoading(false)
  }

  // 一键采纳早间建议
  const adoptSuggestions = () => {
    if (!result?.suggestions) return
    for (const s of result.suggestions) {
      addTask({
        title: s.title,
        energy: s.energy || 'low',
        estimatedMin: s.estimatedMin || 30,
        points: s.points || 10,
      })
    }
    showToast(`已添加 ${result.suggestions.length} 个任务`, 'var(--accent-green)')
    onClose()
  }

  // 一键采纳项目拆解
  const adoptMilestones = () => {
    if (!result?.milestones || !projectId) return
    for (const m of result.milestones) {
      addMilestone(projectId, m.title)
    }
    showToast(`已添加 ${result.milestones.length} 个里程碑`, 'var(--accent-purple)')
    onClose()
  }

  // 保存复盘结果
  const saveReview = () => {
    if (!result) return
    const today = new Date().toISOString().slice(0, 10)
    localStorage.setItem(`dfp:review:${today}`, JSON.stringify(result))
    showToast('复盘已保存', 'var(--accent-blue)')
    onClose()
  }

  const usage = getTodayUsage()
  const titles = {
    decompose: '🤖 AI 项目拆解',
    morning: '🌅 AI 早间规划',
    observe: '🔍 AI 日间观察',
    evening: '📊 AI 晚间复盘',
  }

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />

        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent-blue)', marginBottom: 4 }}>
          {titles[mode] || '🤖 AI'}
        </div>

        {/* API Key 未设置 */}
        {!hasApiKey() && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>
              请输入 Claude API Key（BYOK 模式，Key 仅存在本地）
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 12,
                }}
              />
              <button onClick={handleSetKey} style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-blue)', color: '#fff', fontSize: 12, fontWeight: 600,
              }}>保存</button>
            </div>
          </div>
        )}

        {/* 运行按钮 */}
        {hasApiKey() && !result && !loading && (
          <button
            onClick={runAI}
            style={{
              width: '100%', height: 44, borderRadius: 'var(--radius-sm)', marginTop: 12,
              background: 'var(--accent-blue)', color: '#fff', fontSize: 14, fontWeight: 700,
            }}
          >
            ▶ 开始分析
          </button>
        )}

        {/* 加载中 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--accent-blue)' }}>
            <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 12 }}>AI 分析中...</div>
          </div>
        )}

        {/* 错误 */}
        {error && (
          <div style={{
            marginTop: 12, padding: '12px', borderRadius: 'var(--radius-sm)',
            background: 'var(--accent-red)15', color: 'var(--accent-red)', fontSize: 12,
          }}>
            {error}
            <button onClick={runAI} style={{
              display: 'block', marginTop: 8, padding: '6px 12px', borderRadius: 4,
              background: 'var(--accent-red)20', color: 'var(--accent-red)', fontSize: 11,
            }}>重试</button>
          </div>
        )}

        {/* 结果显示 */}
        {result && (
          <div style={{ marginTop: 12 }}>
            {/* 日间观察 - 纯文本 */}
            {result.mode === 'observe' && (
              <div style={{
                padding: 16, borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', color: 'var(--text-primary)',
                fontSize: 13, lineHeight: 1.6,
              }}>
                {result.raw}
              </div>
            )}

            {/* 早间规划 */}
            {result.mode === 'morning' && (
              <div>
                {result.greeting && (
                  <div style={{ fontSize: 13, color: 'var(--accent-blue)', marginBottom: 12 }}>
                    {result.greeting}
                  </div>
                )}
                {result.suggestions?.map((s, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', marginBottom: 6,
                    background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{s.title}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {s.estimatedMin}min · {s.energy === 'high' ? '⚡' : s.energy === 'physical' ? '🏃' : '☕'} · +{s.points}分
                      {s.reason && ` · ${s.reason}`}
                    </div>
                  </div>
                ))}
                {result.tip && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
                    💡 {result.tip}
                  </div>
                )}
                <button onClick={adoptSuggestions} style={{
                  width: '100%', height: 40, borderRadius: 'var(--radius-sm)', marginTop: 12,
                  background: 'var(--accent-green)', color: 'var(--bg-primary)', fontSize: 13, fontWeight: 700,
                }}>一键采纳全部建议</button>
              </div>
            )}

            {/* 项目拆解 */}
            {result.mode === 'decompose' && result.milestones && (
              <div>
                {result.milestones.map((m, i) => (
                  <div key={i} style={{
                    padding: '10px 12px', marginBottom: 6,
                    background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    fontSize: 13, color: 'var(--text-primary)',
                  }}>
                    {i + 1}. {m.title}
                  </div>
                ))}
                <button onClick={adoptMilestones} style={{
                  width: '100%', height: 40, borderRadius: 'var(--radius-sm)', marginTop: 12,
                  background: 'var(--accent-purple)', color: '#fff', fontSize: 13, fontWeight: 700,
                }}>一键添加为里程碑</button>
              </div>
            )}

            {/* 晚间复盘 */}
            {result.mode === 'evening' && !result.parseError && (
              <div>
                {result.score && (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 36, fontWeight: 700, color: result.score >= 80 ? 'var(--accent-green)' : result.score >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                      {result.score}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>今日评分</div>
                  </div>
                )}
                {result.summary && (
                  <div style={{
                    padding: 12, borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-input)', fontSize: 13,
                    color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.6,
                  }}>{result.summary}</div>
                )}
                {result.highlights?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent-green)', fontWeight: 600, marginBottom: 4 }}>亮点</div>
                    {result.highlights.map((h, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0' }}>✅ {h}</div>
                    ))}
                  </div>
                )}
                {result.improvements?.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent-yellow)', fontWeight: 600, marginBottom: 4 }}>改进</div>
                    {result.improvements.map((imp, i) => (
                      <div key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '2px 0' }}>💡 {imp}</div>
                    ))}
                  </div>
                )}
                {result.encouragement && (
                  <div style={{ fontSize: 12, color: 'var(--accent-blue)', marginTop: 8, fontStyle: 'italic' }}>
                    {result.encouragement}
                  </div>
                )}
                <button onClick={saveReview} style={{
                  width: '100%', height: 40, borderRadius: 'var(--radius-sm)', marginTop: 12,
                  background: 'var(--accent-blue)', color: '#fff', fontSize: 13, fontWeight: 700,
                }}>保存复盘结果</button>
              </div>
            )}

            {/* 解析失败的原始文本 */}
            {result.parseError && (
              <div style={{
                padding: 12, borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)', fontSize: 12,
                color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
              }}>
                {result.raw}
              </div>
            )}
          </div>
        )}

        {/* Token 使用统计 */}
        <div style={{
          marginTop: 16, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center',
        }}>
          今日 AI 调用: {usage.calls} 次 | {usage.input + usage.output} tokens
        </div>
      </div>
    </div>
  )
}
