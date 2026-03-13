import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { uid } from '../utils/uid'
import { todayKey } from '../utils/time'

// FocusRecord = {
//   id: string,
//   taskId: string | null,
//   startedAt: number,
//   endedAt: number,
//   durationMs: number,
//   pointsEarned: number,
//   date: string,
// }

export const useTimer = create(
  persist(
    (set, get) => ({
      // 计时器状态
      status: 'idle', // 'idle' | 'running' | 'paused'
      mode: 'countup', // 'countup' | 'countdown'
      targetMinutes: null,
      startedAt: null,    // 绝对时间戳（毫秒）
      pausedAt: null,
      accumulatedMs: 0,   // 暂停前已累积的毫秒数
      taskId: null,

      // 专注记录
      focusRecords: [],

      // 开始计时
      start: (mode = 'countup', targetMinutes = null, taskId = null) => {
        set({
          status: 'running',
          mode,
          targetMinutes,
          startedAt: Date.now(),
          pausedAt: null,
          accumulatedMs: 0,
          taskId,
        })
      },

      // 暂停
      pause: () => {
        const { startedAt, accumulatedMs } = get()
        const now = Date.now()
        set({
          status: 'paused',
          pausedAt: now,
          accumulatedMs: accumulatedMs + (now - startedAt),
          startedAt: null,
        })
      },

      // 继续
      resume: () => {
        set({
          status: 'running',
          startedAt: Date.now(),
          pausedAt: null,
        })
      },

      // 停止并生成记录
      stop: () => {
        const { startedAt, accumulatedMs, taskId, mode, status } = get()
        if (status === 'idle') return null

        const elapsed = status === 'running'
          ? accumulatedMs + (Date.now() - startedAt)
          : accumulatedMs

        const minutes = Math.floor(elapsed / 60000)
        const pointsEarned = minutes // 1 分钟 = 1 积分

        const record = {
          id: uid(),
          taskId,
          startedAt: get().startedAt || get().pausedAt || Date.now(),
          endedAt: Date.now(),
          durationMs: elapsed,
          pointsEarned,
          date: todayKey(),
        }

        set((s) => ({
          status: 'idle',
          mode: 'countup',
          targetMinutes: null,
          startedAt: null,
          pausedAt: null,
          accumulatedMs: 0,
          taskId: null,
          focusRecords: [...s.focusRecords, record],
        }))

        return record
      },

      // 重置（不生成记录）
      reset: () => {
        set({
          status: 'idle',
          mode: 'countup',
          targetMinutes: null,
          startedAt: null,
          pausedAt: null,
          accumulatedMs: 0,
          taskId: null,
        })
      },

      // 获取已流逝毫秒（绝对时间计算，iOS 后台切回自动校准）
      getElapsedMs: () => {
        const { status, startedAt, accumulatedMs } = get()
        if (status === 'idle') return 0
        if (status === 'paused') return accumulatedMs
        return accumulatedMs + (Date.now() - startedAt)
      },

      // 倒计时剩余毫秒
      getRemainingMs: () => {
        const { mode, targetMinutes } = get()
        if (mode !== 'countdown' || !targetMinutes) return 0
        const elapsed = get().getElapsedMs()
        return Math.max(0, targetMinutes * 60000 - elapsed)
      },

      // 倒计时是否完成
      isCompleted: () => {
        const { mode, targetMinutes } = get()
        if (mode !== 'countdown' || !targetMinutes) return false
        return get().getElapsedMs() >= targetMinutes * 60000
      },

      // 获取最长专注记录（毫秒）
      getMaxFocusDuration: () => {
        const { focusRecords } = get()
        if (focusRecords.length === 0) return 0
        return Math.max(...focusRecords.map((r) => r.durationMs))
      },

      // 获取今日专注记录
      getTodayRecords: () => {
        const today = todayKey()
        return get().focusRecords.filter((r) => r.date === today)
      },
    }),
    {
      name: 'dfp:timer',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        status: state.status,
        mode: state.mode,
        targetMinutes: state.targetMinutes,
        startedAt: state.startedAt,
        pausedAt: state.pausedAt,
        accumulatedMs: state.accumulatedMs,
        taskId: state.taskId,
        focusRecords: state.focusRecords,
      }),
    }
  )
)
