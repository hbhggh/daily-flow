import { create } from 'zustand'
import { getDateStore, setDateStore, getKeysWithPrefix } from './storage'
import { todayKey } from '../utils/time'
import { uid } from '../utils/uid'

// PointTransaction = {
//   id: string,
//   type: 'earn' | 'spend',
//   amount: number,         // 正数
//   source: string,         // 'task_complete' | 'focus_mining' | 'achievement' | 'milestone' | 'custom'
//   label: string,          // 人类可读描述
//   taskId: string | null,
//   timestamp: number,
// }

const loadTransactions = (date) => getDateStore('points', date) || []
const saveTransactions = (date, txns) => setDateStore('points', date, txns)

export const usePoints = create((set, get) => ({
  date: todayKey(),
  transactions: loadTransactions(todayKey()),

  setDate: (dateStr) => {
    const { date, transactions } = get()
    saveTransactions(date, transactions)
    set({ date: dateStr, transactions: loadTransactions(dateStr) })
  },

  earn: (amount, source, label, taskId = null) => {
    const { date, transactions } = get()
    const txn = {
      id: uid(),
      type: 'earn',
      amount: Math.abs(amount),
      source,
      label,
      taskId,
      timestamp: Date.now(),
    }
    const newTxns = [...transactions, txn]
    set({ transactions: newTxns })
    saveTransactions(date, newTxns)
    return txn
  },

  spend: (amount, label) => {
    const { date, transactions } = get()
    const txn = {
      id: uid(),
      type: 'spend',
      amount: Math.abs(amount),
      source: 'custom',
      label,
      taskId: null,
      timestamp: Date.now(),
    }
    const newTxns = [...transactions, txn]
    set({ transactions: newTxns })
    saveTransactions(date, newTxns)
    return txn
  },

  // 今日净收支
  getTodayNet: () => {
    const { transactions } = get()
    return transactions.reduce((sum, t) =>
      t.type === 'earn' ? sum + t.amount : sum - t.amount, 0)
  },

  // 今日赚取总额
  getTodayEarned: () => {
    const { transactions } = get()
    return transactions
      .filter((t) => t.type === 'earn')
      .reduce((sum, t) => sum + t.amount, 0)
  },

  // 今日支出总额
  getTodaySpent: () => {
    const { transactions } = get()
    return transactions
      .filter((t) => t.type === 'spend')
      .reduce((sum, t) => sum + t.amount, 0)
  },

  // 累计总余额（遍历所有日期）
  getAllTimeBalance: () => {
    const keys = getKeysWithPrefix('points')
    let balance = 0
    for (const key of keys) {
      const txns = getDateStore('points', key.split(':').pop()) || []
      for (const t of txns) {
        balance += t.type === 'earn' ? t.amount : -t.amount
      }
    }
    return balance
  },

  // 刷新到今天
  reload: () => {
    const today = todayKey()
    const { date, transactions } = get()
    if (date !== today) {
      saveTransactions(date, transactions)
      set({ date: today, transactions: loadTransactions(today) })
    }
  },

  // 强制从 localStorage 重新加载（云端同步后调用）
  forceReload: () => {
    const { date } = get()
    set({ transactions: loadTransactions(date) })
  },
}))
