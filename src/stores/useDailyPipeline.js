import { create } from 'zustand'
import { getDateStore, setDateStore } from './storage'
import { todayKey } from '../utils/time'
import { uid } from '../utils/uid'

// Task = {
//   id: string,
//   title: string,
//   projectId: string | null,
//   status: 'todo' | 'done' | 'skipped',
//   energy: 'high' | 'low' | 'physical',
//   estimatedMin: number,
//   actualMin: number,
//   points: number,         // 完成获得积分（用户自定义）
//   order: number,
//   createdAt: number,
// }

const loadTasks = (date) => getDateStore('daily', date) || []
const saveTasks = (date, tasks) => setDateStore('daily', date, tasks)

export const useDailyPipeline = create((set, get) => ({
  date: todayKey(),
  tasks: loadTasks(todayKey()),

  setDate: (dateStr) => {
    const { date, tasks } = get()
    // 保存当前日期数据
    saveTasks(date, tasks)
    // 加载新日期数据
    const newTasks = loadTasks(dateStr)
    set({ date: dateStr, tasks: newTasks })
  },

  addTask: ({ title, projectId = null, energy = 'low', estimatedMin = 30, points = 10 }) => {
    const { date, tasks } = get()
    const task = {
      id: uid(),
      title,
      projectId,
      status: 'todo',
      energy,
      estimatedMin,
      actualMin: 0,
      points,
      order: tasks.length,
      createdAt: Date.now(),
    }
    const newTasks = [...tasks, task]
    set({ tasks: newTasks })
    saveTasks(date, newTasks)
    return task
  },

  updateTask: (id, partial) => {
    const { date, tasks } = get()
    const newTasks = tasks.map((t) =>
      t.id === id ? { ...t, ...partial } : t
    )
    set({ tasks: newTasks })
    saveTasks(date, newTasks)
  },

  removeTask: (id) => {
    const { date, tasks } = get()
    const newTasks = tasks.filter((t) => t.id !== id)
    set({ tasks: newTasks })
    saveTasks(date, newTasks)
  },

  moveToStatus: (id, status) => {
    const { date, tasks } = get()
    const newTasks = tasks.map((t) =>
      t.id === id ? { ...t, status } : t
    )
    set({ tasks: newTasks })
    saveTasks(date, newTasks)
  },

  reorderTasks: (fromIndex, toIndex) => {
    const { date, tasks } = get()
    const newTasks = [...tasks]
    const [moved] = newTasks.splice(fromIndex, 1)
    newTasks.splice(toIndex, 0, moved)
    const reordered = newTasks.map((t, i) => ({ ...t, order: i }))
    set({ tasks: reordered })
    saveTasks(date, reordered)
  },

  // 刷新当前日期数据（用于日期切换时）
  reload: () => {
    const today = todayKey()
    const { date } = get()
    if (date !== today) {
      const { tasks } = get()
      saveTasks(date, tasks)
      set({ date: today, tasks: loadTasks(today) })
    }
  },

  // 强制从 localStorage 重新加载（云端同步后调用）
  forceReload: () => {
    const { date } = get()
    set({ tasks: loadTasks(date) })
  },
}))
