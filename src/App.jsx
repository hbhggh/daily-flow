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

export default function App() {
  const [tab, setTab] = useState('pipeline')
  const [celebrateAchievement, setCelebrateAchievement] = useState(null)

  // 成就检查
  const checkAchievements = useCallback(() => {
    const timer = useTimer.getState()
    const points = usePoints.getState()
    const projects = useProjects.getState()
    const achievements = useAchievements.getState()

    // 构建检查上下文
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
      // 发放成就奖励积分
      for (const a of newlyUnlocked) {
        if (a.reward > 0) {
          points.earn(a.reward, 'achievement', `成就: ${a.title}`)
        }
      }
      // 显示第一个新解锁的成就弹窗
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
        // 更新连续天数
        const net = usePoints.getState().getTodayNet()
        useAchievements.getState().updateStreak(net)
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

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
        {tab === 'review' && <ReviewPage />}
        {tab === 'achievements' && <AchievementsPage />}
        <TabBar activeTab={tab} onTabChange={setTab} />
        <InstallPrompt />

        {/* 成就庆祝弹窗 */}
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
