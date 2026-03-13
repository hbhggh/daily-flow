export const todayKey = () => new Date().toISOString().slice(0, 10)

export const isToday = (dateStr) => dateStr === todayKey()

export const formatDuration = (ms) => {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export const formatTime = (date) => {
  const d = date instanceof Date ? date : new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const daysBetween = (a, b) => {
  const d1 = new Date(a)
  const d2 = new Date(b)
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24))
}

export const yesterdayKey = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}
