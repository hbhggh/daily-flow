// localStorage 读写抽象层
// 动态 key store (daily, points) 使用这些工具函数
// 固定 key store (projects, timer, achievements) 使用 Zustand persist

const PREFIX = 'dfp:'

export const getStore = (key) => {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const setStore = (key, data) => {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(data))
    return true
  } catch {
    return false
  }
}

export const removeStore = (key) => {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Ignore
  }
}

// 按日期分区的便捷方法
export const getDateStore = (prefix, date) => getStore(`${prefix}:${date}`)
export const setDateStore = (prefix, date, data) => setStore(`${prefix}:${date}`, data)

// 获取所有匹配前缀的 key（用于跨日聚合）
export const getKeysWithPrefix = (prefix) => {
  const fullPrefix = PREFIX + prefix + ':'
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key.startsWith(fullPrefix)) {
      keys.push(key.slice(PREFIX.length))
    }
  }
  return keys
}

// Zustand persist 的 storage name 前缀
export const STORE_PREFIX = PREFIX
