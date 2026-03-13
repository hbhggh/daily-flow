import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { todayKey } from '../utils/time'

// 成就定义
export const ACHIEVEMENTS = [
  // 专注类
  { id: 'focus_30', title: '初次专注', desc: '完成首次 30 分钟专注', icon: '🔥', category: 'focus',
    check: (ctx) => ctx.maxFocusMs >= 30 * 60000, reward: 30 },
  { id: 'focus_60', title: '一小时大师', desc: '单次专注超过 60 分钟', icon: '⏰', category: 'focus',
    check: (ctx) => ctx.maxFocusMs >= 60 * 60000, reward: 60 },
  { id: 'focus_120', title: '深度潜入', desc: '单次专注超过 120 分钟', icon: '🐋', category: 'focus',
    check: (ctx) => ctx.maxFocusMs >= 120 * 60000, reward: 120 },
  { id: 'focus_180', title: '马拉松跑者', desc: '单次专注超过 180 分钟', icon: '🏃', category: 'focus',
    check: (ctx) => ctx.maxFocusMs >= 180 * 60000, reward: 180 },
  { id: 'focus_300', title: '五小时传说', desc: '单次专注超过 300 分钟', icon: '⭐', category: 'focus',
    check: (ctx) => ctx.maxFocusMs >= 300 * 60000, reward: 100 },
  { id: 'focus_360', title: '六小时突破', desc: '单次专注超过 360 分钟', icon: '💎', category: 'focus',
    check: (ctx) => ctx.maxFocusMs >= 360 * 60000, reward: 200 },
  { id: 'focus_420', title: '七小时神话', desc: '单次专注超过 420 分钟', icon: '👑', category: 'focus',
    check: (ctx) => ctx.maxFocusMs >= 420 * 60000, reward: 400 },

  // 连续天数类
  { id: 'streak_3', title: '三日打卡', desc: '连续 3 天净积分为正', icon: '🔗', category: 'streak',
    check: (ctx) => ctx.streak >= 3, reward: 50 },
  { id: 'streak_7', title: '周冠军', desc: '连续 7 天净积分为正', icon: '🏆', category: 'streak',
    check: (ctx) => ctx.streak >= 7, reward: 200 },
  { id: 'streak_14', title: '双周勇士', desc: '连续 14 天净积分为正', icon: '⚔️', category: 'streak',
    check: (ctx) => ctx.streak >= 14, reward: 500 },
  { id: 'streak_30', title: '月度传奇', desc: '连续 30 天净积分为正', icon: '🌟', category: 'streak',
    check: (ctx) => ctx.streak >= 30, reward: 1000 },

  // 项目类
  { id: 'first_milestone', title: '首个里程碑', desc: '完成第一个项目里程碑', icon: '🎯', category: 'project',
    check: (ctx) => ctx.completedMilestones >= 1, reward: 100 },
  { id: 'project_25', title: '破冰 25%', desc: '某项目进度达到 25%', icon: '🌱', category: 'project',
    check: (ctx) => ctx.maxProjectProgress >= 25, reward: 200 },
  { id: 'project_50', title: '半程突破', desc: '某项目进度达到 50%', icon: '🚀', category: 'project',
    check: (ctx) => ctx.maxProjectProgress >= 50, reward: 300 },
  { id: 'project_75', title: '胜利在望', desc: '某项目进度达到 75%', icon: '🏔️', category: 'project',
    check: (ctx) => ctx.maxProjectProgress >= 75, reward: 400 },
  { id: 'project_100', title: '项目杀手', desc: '完成一个完整项目', icon: '🎉', category: 'project',
    check: (ctx) => ctx.maxProjectProgress >= 100, reward: 500 },

  // 积分类
  { id: 'points_1000', title: '千分俱乐部', desc: '累计获得 1000 积分', icon: '💰', category: 'points',
    check: (ctx) => ctx.totalEarned >= 1000, reward: 100 },
  { id: 'points_5000', title: '五千大关', desc: '累计获得 5000 积分', icon: '💎', category: 'points',
    check: (ctx) => ctx.totalEarned >= 5000, reward: 300 },
  { id: 'points_10000', title: '万分大亨', desc: '累计获得 10000 积分', icon: '👑', category: 'points',
    check: (ctx) => ctx.totalEarned >= 10000, reward: 500 },
]

export const useAchievements = create(
  persist(
    (set, get) => ({
      // 已解锁的成就 { [id]: { unlockedAt: number, notified: boolean } }
      unlocked: {},
      // 连续天数
      streak: 0,
      // 最后活跃日期
      lastActiveDate: null,

      // 检查所有成就，返回新解锁的
      checkAll: (context) => {
        const { unlocked } = get()
        const newlyUnlocked = []

        for (const achievement of ACHIEVEMENTS) {
          if (unlocked[achievement.id]) continue
          try {
            if (achievement.check(context)) {
              newlyUnlocked.push(achievement)
            }
          } catch {
            // 检查失败，跳过
          }
        }

        if (newlyUnlocked.length > 0) {
          const newUnlocked = { ...unlocked }
          for (const a of newlyUnlocked) {
            newUnlocked[a.id] = { unlockedAt: Date.now(), notified: false }
          }
          set({ unlocked: newUnlocked })
        }

        return newlyUnlocked
      },

      markNotified: (id) => {
        set((s) => ({
          unlocked: {
            ...s.unlocked,
            [id]: { ...s.unlocked[id], notified: true },
          },
        }))
      },

      // 更新连续天数
      updateStreak: (todayNet) => {
        const today = todayKey()
        const { lastActiveDate, streak } = get()

        if (lastActiveDate === today) return // 今天已更新

        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().slice(0, 10)

        if (lastActiveDate === yesterdayStr && todayNet > 0) {
          set({ streak: streak + 1, lastActiveDate: today })
        } else if (todayNet > 0) {
          set({ streak: 1, lastActiveDate: today })
        } else {
          set({ streak: 0, lastActiveDate: today })
        }
      },

      getUnlockedCount: () => Object.keys(get().unlocked).length,
    }),
    {
      name: 'dfp:achievements',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
