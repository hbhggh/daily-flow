import { useState, useEffect, useCallback } from 'react'
import { ToastProvider } from './components/Toast'
import TabBar from './components/TabBar'
import MilestoneModal from './components/MilestoneModal'
import PipelinePage from './pages/PipelinePage'
import DashboardPage from './pages/DashboardPage'
import ReviewPage from './pages/ReviewPage'
import AchievementsPage from './pages/AchievementsPage'
import { useDailyPipeline } from './stores/useDailyPipeline'
import { usePoints } from './stores/usePoints'
import { useTimer } from './stores/useTimer'
import { useProjects } from './stores/useProjects'
import { useAchievements } from './stores/useAchievements'
import { unlockAudio } from './utils/audio'
import InstallPrompt from './components/InstallPrompt'
import { supabase } from './sync/supabase'
import { initSync, startSync, stopSync, syncStatus } from './sync/syncEngine'

// Store 重新加载函数（同步引擎在收到云端变更后调用）
function reloadAllStores() {
  useDailyPipeline.getState().forceReload()
  usePoints.getState().forceReload()
  useTimer.persist?.rehydrate?.()
  useProjects.persist?.rehydrate?.()
  useAchievements.persist?.rehydrate?.()
}

export default function App() {
  const [tab, setTab] = useState('pipeline')
  const [celebrateAchievement, setCelebrateAchievement] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [debugInfo, setDebugInfo] = useState('')

  // 初始化同步引擎（仅一次）
  useEffect(() => {
    initSync({
      onSyncEvent: (type) => {
        if (type === 'realtime' || type === 'pulled') {
          reloadAllStores()
        }
      },
      reloadStores: reloadAllStores,
    })

    // 检查已有会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setAuthUser(session.user)
        startSync(session.user.id)
      }
    })

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setAuthUser(session.user)
          startSync(session.user.id)
        } else {
          setAuthUser(null)
          stopSync()
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // 成就检查
  const checkAchievements = useCallback(() => {
    const timer = useTimer.getState()
    const points = usePoints.getState()
    const projects = useProjects.getState()
    const achievements = useAchievements.getState()

    const maxFocusMs = timer.getMaxFocusDuration()
    const totalEarned = (() => {
      let total = 0
      const txns = points.transactions
      for (const t of txns) {
        if (t.type === 'earn') total += t.amount
      }
      return total
    })()

    const completedMilestones = projects.projects.reduce(
      (sum, p) => sum + p.milestones.filter((m) => m.done).length, 0
    )
    const maxProjectProgress = Math.max(
      0,
      ...projects.projects.map((p) => {
        const prog = projects.getProjectProgress(p.id)
        return prog.percentage
      })
    )

    const context = {
      maxFocusMs,
      streak: achievements.streak,
      completedMilestones,
      maxProjectProgress,
      totalEarned,
    }

    const newlyUnlocked = achievements.checkAll(context)

    if (newlyUnlocked.length > 0) {
      for (const a of newlyUnlocked) {
        if (a.reward > 0) {
          points.earn(a.reward, 'achievement', `成就: ${a.title}`)
        }
      }
      setCelebrateAchievement(newlyUnlocked[0])
    }
  }, [])

  // 监听任务状态变化 → 检查成就
  useEffect(() => {
    const unsub1 = useDailyPipeline.subscribe(() => checkAchievements())
    const unsub2 = useTimer.subscribe(
      (state) => state.focusRecords.length,
      () => checkAchievements()
    )
    const unsub3 = useProjects.subscribe(() => checkAchievements())
    return () => { unsub1(); unsub2(); unsub3() }
  }, [checkAchievements])

  // 日期切换检测
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        useDailyPipeline.getState().reload()
        usePoints.getState().reload()
        const net = usePoints.getState().getTodayNet()
        useAchievements.getState().updateStreak(net)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  // 同步调试面板（每秒更新）
  useEffect(() => {
    const id = setInterval(() => {
      if (authUser) {
        setDebugInfo(
          `poll:${syncStatus.pollCount} push:${syncStatus.pushCount} pull:${syncStatus.pullCount} rt:${syncStatus.realtimeCount} ` +
          `chg:${syncStatus.changed ? 'Y' : 'N'} ${syncStatus.lastPullTime} ${syncStatus.lastError}`
        )
      }
    }, 1000)
    return () => clearInterval(id)
  }, [authUser])

  // iOS 音频解锁
  useEffect(() => {
    const handler = () => {
      unlockAudio()
      document.removeEventListener('touchstart', handler)
    }
    document.addEventListener('touchstart', handler, { once: true })
    return () => document.removeEventListener('touchstart', handler)
  }, [])

  return (
    <ToastProvider>
      <div className="app">
        {tab === 'dashboard' && <DashboardPage />}
        {tab === 'pipeline' && <PipelinePage />}
        {tab === 'review' && <ReviewPage authUser={authUser} onAuthChange={setAuthUser} />}
        {tab === 'achievements' && <AchievementsPage />}
        <TabBar activeTab={tab} onTabChange={setTab} />
        <InstallPrompt />

        {/* 同步调试条 */}
        {authUser && debugInfo && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0,
            padding: '2px 8px',
            paddingTop: 'env(safe-area-inset-top, 2px)',
            background: 'rgba(0,0,0,0.85)',
            color: '#4ade80', fontSize: 9, fontFamily: 'monospace',
            zIndex: 9999, whiteSpace: 'nowrap', overflow: 'hidden',
          }}>
            v6 | {debugInfo}
          </div>
        )}
        {!authUser && (
          <div style={{
            position: 'fixed', top: 'env(safe-area-inset-top, 8px)',
            right: 12, fontSize: 9, color: 'var(--text-muted)',
            opacity: 0.6, zIndex: 10, pointerEvents: 'none',
          }}>
            v6
          </div>
        )}

        {celebrateAchievement && (
          <MilestoneModal
            achievement={celebrateAchievement}
            onClose={() => setCelebrateAchievement(null)}
          />
        )}
      </div>
    </ToastProvider>
  )
}
