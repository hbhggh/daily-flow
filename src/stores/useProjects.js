import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { uid } from '../utils/uid'

// Project = {
//   id: string,
//   title: string,
//   description: string,
//   color: string,
//   status: 'active' | 'paused' | 'done',
//   milestones: Milestone[],
//   createdAt: number,
//   updatedAt: number,
// }
//
// Milestone = {
//   id: string,
//   title: string,
//   done: boolean,
// }

export const useProjects = create(
  persist(
    (set, get) => ({
      projects: [],

      addProject: ({ title, description = '', color = '#4ade80' }) => {
        const project = {
          id: uid(),
          title,
          description,
          color,
          status: 'active',
          milestones: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((s) => ({ projects: [...s.projects, project] }))
        return project
      },

      updateProject: (id, partial) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...partial, updatedAt: Date.now() } : p
          ),
        }))
      },

      removeProject: (id) => {
        set((s) => ({ projects: s.projects.filter((p) => p.id !== id) }))
      },

      getProject: (id) => get().projects.find((p) => p.id === id),

      // 里程碑操作
      addMilestone: (projectId, title) => {
        const milestone = { id: uid(), title, done: false }
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? { ...p, milestones: [...p.milestones, milestone], updatedAt: Date.now() }
              : p
          ),
        }))
        return milestone
      },

      toggleMilestone: (projectId, milestoneId) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  milestones: p.milestones.map((m) =>
                    m.id === milestoneId ? { ...m, done: !m.done } : m
                  ),
                  updatedAt: Date.now(),
                }
              : p
          ),
        }))
      },

      removeMilestone: (projectId, milestoneId) => {
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  milestones: p.milestones.filter((m) => m.id !== milestoneId),
                  updatedAt: Date.now(),
                }
              : p
          ),
        }))
      },

      // 计算项目进度
      getProjectProgress: (id) => {
        const project = get().projects.find((p) => p.id === id)
        if (!project) return { total: 0, completed: 0, percentage: 0 }
        const total = project.milestones.length
        const completed = project.milestones.filter((m) => m.done).length
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
        return { total, completed, percentage }
      },

      // 获取活跃项目
      getActiveProjects: () => get().projects.filter((p) => p.status === 'active'),
    }),
    {
      name: 'dfp:projects',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
